from flask import Flask, jsonify, request
from langchain_unstructured import UnstructuredLoader
from werkzeug.utils import secure_filename
import requests
import os
import chromadb
import json
import ast
from flask_cors import CORS
from collections import OrderedDict
import nltk
nltk.download('punkt')
nltk.download('punkt_tab')
nltk.download('averaged_perceptron_tagger_eng')
# test script
# curl -X POST localhost:5000/add_reviewer -F "file=@test_files/solicitation-sample.pdf"
# curl -X POST localhost:5000/add_reviewee -F "file=@test_files/proposal-sample.pdf"
# curl -X GET localhost:5000/questions

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}

# define vector databases
client = chromadb.Client()
reviewer_collection = client.create_collection(name="reviewer_docs")
reviewee_collection = client.create_collection(name="reviewee_collection")
global_reviewer_documents = []
global_reviewee_documents = []
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.json.sort_keys = False

def call_ollama(custom_payload):
    url = 'http://host.containers.internal:11434/api/generate'
    # payload =  {'model': 'llama3.1', 'prompt': prompt, 'stream':False}
    payload=custom_payload
    response = requests.post(url, json=payload)
    return response.json() if response.ok else f"Error: {response.status_code} {response}"

@app.route('/')
def hello_world():
    return 'Hello, World!'



def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS



# curl -X POST http://localhost:5000/add_reviewer \
#  -F "file=@path/to/your/file.pdf"
@app.route('/add_reviewer', methods=['POST'])
def add_reviewer():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected for uploading"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            loader = UnstructuredLoader(
                filepath,
                chunking_strategy="by_title",
                max_characters=1500,
                new_after_n_chars=2000,
                include_orig_elements=False,
            )
            print(loader)
            reviewer_doc_loader = loader.load()
            reviewer_documents = [[i.metadata["page_number"], i.page_content] for i in reviewer_doc_loader]
            
            
            # store each reviewer document in a vector embedding database, clear the vector database first


            documents = client.get_collection(name="reviewer_docs")  # Adjust method based on actual API
            all_ids = [doc for doc in documents.get()["ids"]]
         
            # uploading another document
            if all_ids != []:
                reviewer_collection.delete(ids=all_ids)

            for i, data in enumerate(reviewer_documents):
                text = data[1]
                pagenum = data[0]

                reviewer_collection.add(
                    ids=[str(i)],
                    documents=[text],
                    metadatas = [{"page_number":pagenum}]

                )
            
            # remove the file after processing

            os.remove(filepath)
            
            return jsonify({
                "status": "success",
                "message": f"Added {len(reviewer_documents)} reviewer documents to the collection"
            }), 201
        
        except Exception as e:
            # Ensure the file is removed if an error occurs
            print(e)
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({
                "error": f"An error occurred: {str(e)}",
                "details": "Processing the uploaded PDF failed"
            }), 400
    else:
        return jsonify({"error": "Allowed file type is pdf"}), 400

# curl -X POST http://localhost:5000/add_reviewee \
#  -F "file=@path/to/your/file.pdf"
@app.route('/add_reviewee', methods=['POST'])
def add_reviewee():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected for uploading"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # add to reviewee vector db
            loader = UnstructuredLoader(
                filepath,
                chunking_strategy="by_title",
                max_characters=500,
                include_orig_elements=False,
            )
            
            reviewee_docs = loader.load()
            reviewee_documents = [[i.metadata["page_number"], i.page_content] for i in reviewee_docs]

            documents = client.get_collection(name="reviewee_collection")
            all_ids = [doc for doc in documents.get()["ids"]]
            # uploading another document
            if all_ids != []:
                reviewee_collection.delete(ids=all_ids)

            # store each document in a vector embedding database
            for i, data in enumerate(reviewee_documents):
                text = data[1]
                pagenum = data[0]
                reviewee_collection.add(
                ids=[str(i)],
                documents=[text],
                metadatas=[{"page_number":pagenum}]
              )
            # remove the file after processing
            os.remove(filepath)
            
            return jsonify({
                "status": "success",
                "message": f"Added {len(reviewee_documents)} reviewee documents to the collection"
            }), 201
        
        except Exception as e:
            print(e)
            # Ensure the file is removed if an error occurs
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({
                "error": f"An error occurred: {str(e)}",
                "details": "Processing the uploaded PDF failed"
            }), 400
    else:
        return jsonify({"error": "Allowed file type is pdf"}), 400

#curl -X GET http://localhost:5000/questions
@app.route('/questions', methods=['GET'])
def questions():
    optional_prompt = request.args.get('prompt')
    print(optional_prompt)
    
    if optional_prompt:
        embed = optional_prompt
    else:
        embed = "Generate me specific questions to grade any document responding to that given text. To get a good grade, all the answers to the questions should be yes."

    question_prompt = f"""The given text was a rubric to evaluate other documents. {embed} If there are no questions that the given text illicits, return "placeholder" as a question in the given format.
    Return ONLY the questions in the following format: ["question1", "question2", "question3"] with NO \' or \" INSIDE OF EACH QUESTION EVEN IF IT IS INCORRECT GRAMME. 
    Ensure the questions can be parsed by ast.literal_eval"""
    all_questions = []
    documents = client.get_collection(name="reviewer_docs")  # Adjust method based on actual API
    # Extract text content from documents
    reviewer_documents = [doc for doc in documents.get()["documents"]]
    reviewer_citations = [citation["page_number"] for citation in documents.get()["metadatas"]]
    for i in range(0,len(reviewer_documents)):
        reviewer_documents[i] = (reviewer_documents[i], reviewer_citations[i])



    for content, citation in reviewer_documents:
        print(i)

        ollama_prompt=f"Using this text: {content}\n\n\n\n. {question_prompt}"

        list_llama_settings = {
            'model': 'llama3.1',
            'prompt': f'{ollama_prompt}',
            'stream': False,  # Boolean value instead of string
            'system': """You are a robot that processes documents and only returns in the format ['question 1', 'question 2', 'question 3']. You will not return any natural language other than this format. Ensure none of the questions themselves have the characters ' or ", only they are encapsulated by '. If the question has one of those characters, rewrite it so it does not, or just write it in incorrect grammar. You will not return any natural language other than within the list asked to do so.""",
            'options': {
                'num_ctx': 4096,  # Integer value
                'top_k': 1,       # Integer value
                'top_p': 0.1,      # Float value
                'temperature':0
            }
        }

        output = call_ollama(custom_payload=list_llama_settings)
        print(output)
        try:
            res = ast.literal_eval(output['response'])
            res = [f"{response} (Page {citation})" for response in res]
            print(res)
            all_questions.append(res)
        except Exception as e:
            print(e)
            return jsonify({
                    "error": f"An error occurred: {str(e)}",
                    "details": "questions not being parsed correctly"
                }), 400
            
    total_questions = []
    for i in all_questions:
        for questions in i:
            total_questions.append(questions)
    
    question_string = str(total_questions)
    # refine the list of questions
    refine_prompt = "Return the list without duplicate questions and any questions that are too similar to each other ENSURE THE QUESTION STILL HAS ITS ASSOCIATED CITATION. Ensure all questions are evaluation questions, that seek to evaluate another document. If they are not, remove it. Ensure the questions can be parsed by ast.literal_eval"
    ollama_prompt=f"Using this list of questions: {question_string}. Perform this task: {refine_prompt}"

    list_llama_settings = {
        'model': 'llama3.1',
        'prompt': f'{ollama_prompt}',
        'stream': False,  # Boolean value instead of string
        'system': """You are a robot that processes documents and only returns in the format ['question 1', 'question 2', 'question 3']. You will not return any natural language other than this format. Ensure none of the questions themselves have the characters ' or ", only they are encapsulated by '. If the question has one of those characters, rewrite it so it does not, or just write it in incorrect grammar. You will not return any natural language other than within the list asked to do so.""",
        'options': {
            'num_ctx': 4096,  # Integer value
            'top_k': 1,       # Integer value
            'top_p': 0.1 ,     # Float value
            'temperature' :0
        }
    }

    output2 = call_ollama(custom_payload=list_llama_settings)
    
    try:
        questions = ast.literal_eval(output2['response'])
        questions = [f"{count+1}. {element}" for count, element in enumerate(questions)]
        return jsonify(questions)
    except Exception as e:
        return jsonify({
                "error": f"An error occurred: {str(e)}",
                "details": "questions not being parsed correctly"
            }), 400
        



# curl -X GET "http://localhost:5000/answer_questions?questions=What%20is%20the%20capital%20of%20France%3F"
# curl -G "http://localhost:5000/answer_questions" --data-urlencode "questions=[\"Does the document mention a two-step proposal submission process?\", \"Is the research in Emerging Worlds related to understanding how the Solar System formed and evolved?\", \"Are theoretical studies, analytical and numerical modeling, sample-based studies of extraterrestrial materials covered?\"]"

@app.route('/answer_questions', methods=['GET'])
def answer_questions():
    optional_prompt = request.args.get('prompt')
    temp = int(request.args.get('temperature'))
    num_of_sources = int(request.args.get('num_sources'))
    model = request.args.get('model')
    if optional_prompt:
        embed = optional_prompt
    else:
        embed = "Answer the following question by analyzing the content of the text"
    try:
        # get questions:
        questions_param = request.args.get('questions', None)
        if not questions_param:
            return jsonify({"error": "Missing 'questions' query parameter"}), 400

        # parse questions
        try:
            questions = ast.literal_eval(questions_param)
            if not isinstance(questions, list):
                raise ValueError("Invalid questions format (should be a list)")
        except ValueError as e:
            return jsonify({"error": f"Invalid questions format: {e}"}), 400

        answers = OrderedDict() 

        # process questions and generate answers
        for question in questions:
            question=question.split("?")[0] + "?"
  
            results = reviewee_collection.query(
                query_texts=[question], 
                n_results=num_of_sources
            )

            data = results['documents']
            pagenums = [i['page_number'] for i in results['metadatas'][0]]



            ollama_prompt=f"Using this text: {data}. \n\n\n {embed}: {question}."
            qa_llama_settings = {
                'model': f"{model}",
                'prompt': ollama_prompt,
                'stream': False,
                'options': {
                    'num_ctx': 4096,       # A more standard value for context size, depending on model capabilities
                    'top_k': 40,           # Consider more top probable tokens for more diverse responses
                    'top_p': 0.9,          # Use a higher probability mass for more natural language responses
                    'temperature': 0.7,    # A moderate temperature to balance randomness and coherence
                    'frequency_penalty': 0.0,  # Penalize repeated phrases (can be adjusted)
                    'presence_penalty': 0.0    # Penalize repeating words in the response (can be adjusted)
                }
            }

            output = call_ollama(custom_payload=qa_llama_settings)
            

            # Store Answer
            answers[question] = f"{output['response']}\nPages: {pagenums}"

        # 5. Return JSON Response:
        
        return jsonify(answers)

    except Exception as e:
        # Handle exceptions gracefully
        print(e)
        return jsonify({"error": f"An error occurred: {e}"}), 500

@app.route('/document_qa', methods=['GET'])
def document_qa():
    prompt = request.args.get('prompt')
    rag_document_number = int(request.args.get('source_num'))
    if not prompt:
        return jsonify({"error": "Prompt parameter is required"}), 400
    
    try:
        if "@doc2" in prompt:
            results = reviewee_collection.query(
                query_texts=[prompt], 
                n_results=rag_document_number 
            )
            data = results['documents']
            pagenums = [item['page_number'] for item in results['metadatas'][0]] if results['metadatas'] else []

        else:
            results = reviewer_collection.query(
                query_texts=[prompt], 
                n_results=rag_document_number 
            )
            data = results['documents']
            pagenums = [item['page_number'] for item in results['metadatas'][0]] if results['metadatas'] else []
        
        return jsonify({"documents": data, "page_numbers": pagenums})

    except Exception as e:
        print(e)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route('/write_comments', methods=['GET'])
def write_comments():
    results = []
    try:
        docs = reviewee_collection.get() 
        reviewee_documents = [i["documents"] for i in docs]
        for chunk in reviewee_documents:
         
            output = ollama.generate(
              model="comment-llama3.1",
              prompt=f"You are a PEER REVIEWER who generates comments ONLY IF THE PROVIDED TEXT HAS STUFF TO COMMENT ON. IF THERE ARE NO COMMENTS, SIMPLY RETURN 'No comment'\n\n\n\n\n\n\n\n Generate comments using this text:\n{chunk}."
            )
    
            answer = output['response']
            result = {
                "_id": str(doc["_id"]),  # Convert ObjectId to string
                "original_text": chunk,
                "comment": answer
            }
    
            results.append(result)
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


    return jsonify(results)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=9001)