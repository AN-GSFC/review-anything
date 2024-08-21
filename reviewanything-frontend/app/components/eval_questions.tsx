import React, { useState } from 'react';
import { 
  Text,
  Box, 
  useColorModeValue, 
  VStack, 
  Button, 
  HStack, 
  Spinner, 
  Alert, 
  AlertIcon, 
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Textarea,
  Input,
  useToast,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  CloseButton
} from '@chakra-ui/react';
import { EditIcon, SettingsIcon } from '@chakra-ui/icons';
import ReactMarkdown from 'react-markdown';

const EditableTextArea = () => {
  const [text, setText] = useState('');
  const [answers, setAnswers] = useState({ 'Tab 1': { content: '', isLoading: false } });
  const [activeTab, setActiveTab] = useState('Tab 1');
  const [loadingTabs, setLoadingTabs] = useState({});
  const [model, setModel] = useState('llama3.1');
  const [temperature, setTemperature] = useState(0); // Default temperature
  const [numberOfSources, setNumberOfSources] = useState(5); // Default number of sources
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [prompt, setPrompt] = useState('Generate me specific questions to grade any document responding to that given text. To get a good grade, all the answers to the questions should be yes');
  const [answerPrompt, setAnswerPrompt] = useState('Answer the following question by analyzing the content of the text. The answer should not contain any markdown.');
  const { isOpen: isQuestionModalOpen, onOpen: onQuestionModalOpen, onClose: onQuestionModalClose } = useDisclosure();
  const { isOpen: isAnswerModalOpen, onOpen: onAnswerModalOpen, onClose: onAnswerModalClose } = useDisclosure();
  const bg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const API_PORT = 9001;
  const toast = useToast();
  const handleChange = (event) => {
    setText(event.target.value);
    setShowAlert(false);
  };
  const handleGenerateQuestions = async (e) => {
    if (e) e.preventDefault();
    if (text.trim() != '' ) {
      setShowAlert(true);
      return;
    }

    try {
      setIsLoadingQuestions(true);
      const response = await fetch(`http://localhost:${API_PORT}/questions?prompt=${encodeURIComponent(prompt)}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const questions = await response.json();
      const formattedQuestions = questions.map((question) => `${question}`).join('\n');
      setText(formattedQuestions);
      setIsLoadingQuestions(false);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setIsLoadingQuestions(false);
    }
  };

  const handleEvaluateQuestions = async (e) => {
    if (e) e.preventDefault();
    try {
      const formattedQuestions = text.split('\n')
        .map(line => line.replace(/^\d+\.\s*/, ''))
        .filter(question => question.trim() !== '');

      if (formattedQuestions.length === 0) {
        console.log('No questions to evaluate.');
        return;
      }

      setAnswers(prevAnswers => ({
        ...prevAnswers,
        [activeTab]: { ...prevAnswers[activeTab], isLoading: true }
      }));

      const queryParam = encodeURIComponent(JSON.stringify(formattedQuestions));

      const response = await fetch(`http://localhost:${API_PORT}/answer_questions?questions=${queryParam}&prompt=${encodeURIComponent(answerPrompt)}&temperature=${temperature}&num_sources=${numberOfSources}&model=${model}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const answersData = await response.json();

      const formattedAnswers = Object.entries(answersData).map(([question, answer], index) => {
        return `${index + 1}. ${question}\n${answer}`;
      }).join('\n\n');
      
      setAnswers(prevAnswers => ({
        ...prevAnswers,
        [activeTab]: { content: formattedAnswers, isLoading: false }
      }));
    } catch (error) {
      console.error('Error evaluating questions:', error);
      setAnswers(prevAnswers => ({
        ...prevAnswers,
        [activeTab]: { ...prevAnswers[activeTab], isLoading: false }
      }));
    }
  };

  const addTab = () => {
    const newTabId = `Tab ${Object.keys(answers).length + 1}`;
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [newTabId]: { content: '', isLoading: false }
    }));
    setActiveTab(newTabId);
  };
  
  const deleteTab = (tabToDelete) => {
    if (Object.keys(answers).length === 1) {
      toast({
        title: "Cannot delete all tabs.",
        description: "You need at least one tab.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const { [tabToDelete]: _, ...remainingTabs } = answers;
    setAnswers(remainingTabs);
    setActiveTab(Object.keys(remainingTabs)[Object.keys(remainingTabs).length - 1] || '');
  };

  return (
    <VStack spacing={4} align="stretch" p={4}>
      {showAlert && (
        <Alert status="warning">
          <AlertIcon />
          Please empty the text box to generate new questions.
        </Alert>
      )}
      <Box
        p={4}
        bg={bg}
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="md"
        minHeight="350px"
        display="flex"
        justifyContent="center"
        alignItems="center"
        position="relative"
      >
               {isLoadingQuestions ? (
          <Box textAlign="center">
            <Spinner size="xl" />
            <p>Generating questions...</p>
          </Box>
        ) : (
          <Textarea
            value={text}
            onChange={handleChange}
            whiteSpace="pre-wrap"
            placeholder='Edit generated questions or add your own.'
            size="md"
            minHeight="350px"
          />
        )}
        <IconButton
          aria-label="Edit prompt"
          icon={<SettingsIcon />}
          position="absolute"
          top="4"
          right="4"
          onClick={onQuestionModalOpen}
        />
      </Box>
      <HStack spacing={4}>
        <Button colorScheme="blue" onClick={handleGenerateQuestions}>
          Generate Questions
        </Button>
        <Button colorScheme="blue" onClick={handleEvaluateQuestions}>
          Evaluate Questions
        </Button>
        <Button colorScheme="green" onClick={addTab}>
         + Add Tab
        </Button>
      </HStack>
      <Box
        p={4}
        bg={bg}
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="md"
        minHeight="150px"
        display="flex"
        justifyContent="center"
        alignItems="center"
        position="relative"
      >
        <Tabs variant="enclosed" width="100%" isLazy onChange={(index) => setActiveTab(Object.keys(answers)[index])}>
          <TabList>
            {Object.keys(answers).map((tabName) => (
              <HStack key={tabName}>
                <Tab>{tabName}</Tab>
                <CloseButton 
                  aria-label={`Close ${tabName}`}
                  onClick={() => deleteTab(tabName)}
                />
              </HStack>
            ))}
          </TabList>
          <TabPanels>
            {Object.entries(answers).map(([tabName, tabData]) => (
              <TabPanel key={tabName}>
                {tabData.isLoading ? (
                  <Box textAlign="center">
                    <Spinner size="xl" />
                    <Text mt={2}>Generating answers...</Text>
                  </Box>
                ) : (
                  <Textarea
                    placeholder="Answers will appear here."
                    p={4}
                    value={tabData.content}
                    borderWidth="1px"
                    borderColor={borderColor}
                    borderRadius="md"
                    bg={bg}
                    minHeight="350px"
                    whiteSpace="pre-wrap"
                    overflowY="auto"
                    readOnly
                  />
                )}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
        <IconButton
          aria-label="Edit prompt"
          icon={<SettingsIcon />}
          position="absolute"
          top="4"
          right="4"
          onClick={onAnswerModalOpen}
        />
      </Box>
      <Modal isOpen={isQuestionModalOpen} onClose={onQuestionModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Settings for Question Generation</ModalHeader>

          <ModalCloseButton />

          <ModalBody>
          <Box mt={4}>
          <Text fontSize="sm" mb={2}>Change Prompt</Text>
          <Text fontSize="sm" opacity="0.7" mb={2}>
            The model will be given this prompt along with a section of the text. You can edit this prompt.
          </Text>
            <Textarea
            
              minHeight="150px"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </Box>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onQuestionModalClose}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isAnswerModalOpen} onClose={onAnswerModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Settings for Answer Evaluation</ModalHeader>

          <ModalCloseButton />

          <ModalBody>
          <Box mt={4}>
        <Text fontSize="sm" mb={2}>Base Model</Text>
        <Text fontSize="sm" opacity="0.7" mb={2}>
        You can change the base model used for question answering by specifying the string name of the model in ollama's model library (https://ollama.com/library). Please ensure the model is installed and updated on the device the application is running on with ollama pull [model_name].
      </Text>
      <Input
          type="string"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
      </Box>
      <Box mt={4}>
      <Text fontSize="sm" mb={2}>Change Prompt</Text>
      <Text fontSize="sm" opacity="0.7" mb={2}>
        The model will use this prompt to generate answers based on each of the provided questions. You can edit this prompt.
      </Text>
      <Textarea
        minHeight="150px"
        value={answerPrompt}
        onChange={(e) => setAnswerPrompt(e.target.value)}
      />
      </Box>
      <Box mt={4}>
        <Text fontSize="sm" mb={2}>Model Temperature (0-1):</Text>
        <Text fontSize="sm" opacity="0.7" mb={2}>
            The model will be more creative with a higher temperature, and more coherent with a lower temperature.
      </Text>
        <Input
          type="number"
          step="0.1"
          min="0"
          max="1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
        />
      </Box>
      <Box mt={4}>
        <Text fontSize="sm" mb={2}>Number of Sources (1-15):</Text>
        <Text fontSize="sm" opacity="0.7" mb={2}>
            Change the number of sections the model pulls from to formulate its response.
      </Text>
        <Input
          type="number"
          min="1"
          max="15"
          value={numberOfSources}
          onChange={(e) => setNumberOfSources(parseInt(e.target.value))}
        />
      </Box>
    </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onAnswerModalClose}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
);
};

export default EditableTextArea;
