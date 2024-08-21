import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useToast, Text, Box, Textarea, Button, useColorModeValue, VStack, Flex, ChakraProvider, Spinner, InputGroup, InputRightElement, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, FormControl, FormLabel, Input, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, HStack } from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';

const debounce = (func: { (e?: React.FormEvent<HTMLFormElement> | undefined): Promise<void>; (arg0: any): void; }, wait: number | undefined) => {
  let timeout: string | number | NodeJS.Timeout | undefined;
  return (...args: any) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const ReadableTextArea: React.FC = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [model, setModel] = useState('llama3.1');
  const [temperature, setTemperature] = useState(0);
  const [ragDocumentNumber, setRagDocumentNumber] = useState(5);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const END_POINT = 'host.containers.internal:11434'
  const bg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(true);
  const API_PORT = 9001
  const toast = useToast()
  const scrollToBottom = () => {
    if (shouldScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSend = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault(); // Prevent default form submission behavior

    if (inputMessage.trim()) {
      const newMessage = { role: 'user' as const, content: inputMessage };
      setMessages(prevMessages => [...prevMessages, newMessage]);
      setInputMessage('');
      setShouldScroll(true);

      if (/@doc1|@doc2/.test(inputMessage)) {
        try {
          const response = await fetch(`http://localhost:${API_PORT}/document_qa?prompt=${encodeURIComponent(inputMessage)}&source_num=${ragDocumentNumber}`);
          if (!response.ok) {
            toast({
              title: "Message Failed",
              description: `There was a problem with sending your message: ${response.status}`,
              status: "error",
              duration: 6000,
              isClosable: true,
            });
          }

          const data = await response.json();
          const docData = data.documents; // Ensure this matches your actual response
          const pageNumbers = data.page_numbers; // Ensure this matches your actual response

          console.log('Document Data:', docData);
          console.log('Page Numbers:', pageNumbers);

          const updatedMessage = `${docData}\n\n Using the given text, answer the following question. ENSURE THE ANSWER REFLECTS THE TEXT: ${inputMessage}`;

          // Pass pageNumbers to handleGenerateAnswers
          handleGenerateAnswers([...messages, { role: 'user', content: updatedMessage }], pageNumbers);
        } catch (error) {
          console.error('Error fetching document data:', error);
        }
      } else {
        handleGenerateAnswers([...messages, newMessage]);
      }
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInputMessage('');
    setShouldScroll(true);
  };

  const debouncedHandleSend = useMemo(
    () => debounce(handleSend, 300),
    [inputMessage]
  );

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      debouncedHandleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setInputMessage(e.target.value);
  };

  const handleGenerateAnswers = async (chatHistory: { role: 'user' | 'assistant'; content: string }[], pageNumbers?: number[]) => {
    setIsLoading(true);
    

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch(`http://localhost:9000/callollama`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: `${model}`,
          messages: chatHistory,
          options: {
            "temperature":temperature
          },
        }),
        signal: controller.signal
      });

      setIsStreaming(true);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      if (reader) {
        setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(Boolean);

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.message && data.message.content) {
                accumulatedText += data.message.content;
                setMessages(currentMessages => {
                  const updatedMessages = [...currentMessages];
                  updatedMessages[updatedMessages.length - 1] = { role: 'assistant', content: accumulatedText };
                  return updatedMessages;
                });
              }
              if (data.done) {
                setIsStreaming(false);
                setShouldScroll(true);

                // Append page numbers if available
                if (pageNumbers) {
                  setMessages(currentMessages => {
                    const updatedMessages = [...currentMessages];
                    const lastMessage = updatedMessages.pop();
                    if (lastMessage) {
                      updatedMessages.push({
                        ...lastMessage,
                        content: `${lastMessage.content}\n\n\nPage Sources: [${pageNumbers.join(', ')}]`
                      });
                    }
                    return updatedMessages;
                  });
                }

                break;
              }
            } catch (err) {
              console.error('Error parsing JSON:', err);
            }
          }
        }
      }
    } catch (error) {
      toast({
        title: "Message Failed",
        description: `There was a problem with sending your message: your ollama endpoint is not responding. Please ensure the ollama endpoint is working and the model specified is installed correctly.`,
        status: "error",
        duration: 20000,
        isClosable: true,
      });
      console.log(error)
    } finally {
      setIsLoading(false);
    }
  };

  const highlightSpecialReferences = useCallback((text: string) => {
    const highlightedText = text.replace(/(@doc1|@doc2)/g, (match) => (
      `<span style="background-color: yellow; font-weight: bold;">${match}</span>`
    ));
    return { __html: highlightedText };
  }, []);

  const memoizedMessages = useMemo(() => (
    messages.map((msg, index) => (
      <Flex
        key={index}
        direction={msg.role === 'user' ? 'row-reverse' : 'row'}
        mb={2}
        align="flex-start"
      >
        <Box
        
          p={2}
          bg={msg.role === 'user' ? 'blue.100' : 'gray.100'}
          borderRadius="md"
          maxWidth="60%"

          padding="8px"
        >
          <ReactMarkdown>
            {msg.content}
          </ReactMarkdown>
        </Box>
      </Flex>
    ))
  ), [messages]);

  return (
    <ChakraProvider>
      <VStack spacing={4} align="stretch" p={4} bg={bg} minHeight="70vh" borderRadius="md" borderWidth="1px" borderColor={borderColor} marginTop={4}>
        <Box
          p={4}
          bg={bg}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="md"
          flex="1"
          overflowY="auto"
          maxHeight="600px"
          
        >
          {memoizedMessages}
          {isLoading && !isStreaming && (
            <Flex justify="center" align="center" height="50px">
              <Spinner size="sm" />
            </Flex>
          )}
          <div ref={messagesEndRef} />
        </Box>
        <HStack>
        <Button
          size="sm"
          onClick={handleReset}
          colorScheme="red"
          ml={2}
        >
          Reset Chat
        </Button>

        <Button
          size="sm"
          onClick={() => setIsSettingsOpen(true)}
          colorScheme="blue"
          ml={2}
        >
          Settings
        </Button>
        </HStack>
        <InputGroup>
          <Textarea
            placeholder="Type your message..."
            value={inputMessage}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            pr="4.5rem"
            resize="none"
            minH="100px"
          />
          <InputRightElement className="mr-2">
           
          <Button
              size="sm"
              onClick={isStreaming ? handleStop : handleSend}
              colorScheme={isStreaming ? 'red' : 'blue'}
              isLoading={isLoading && !isStreaming}
            >
              {isStreaming ? 'Stop' : '→'}
            </Button>
          </InputRightElement>
        </InputGroup>

        <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Document Chat Settings</ModalHeader>
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
          value={ragDocumentNumber}
          onChange={(e) => setRagDocumentNumber(parseFloat(e.target.value))}
        />
      </Box>     

    </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={() => setIsSettingsOpen(false)}>
                Save
              </Button>
              <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </ChakraProvider>
  );
};

export default ReadableTextArea;
