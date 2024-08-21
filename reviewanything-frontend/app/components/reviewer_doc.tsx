import { useState, useEffect, DragEvent, useRef } from "react";
import { Button, Box, useToast, Icon, Text, Spinner } from "@chakra-ui/react";
import { AiOutlineUpload } from "react-icons/ai"; // Upload icon from react-icons

export const PDFUploaderAndViewer = () => {
  const [file, setFile] = useState<string | undefined>(() => {
    const savedFile = sessionStorage.getItem("pdfBlobUrl");
    return savedFile || undefined;
  });
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const toast = useToast();
  const resetButtonRef = useRef<HTMLButtonElement | null>(null);
  const API_PORT = 9001
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const blobUrl = URL.createObjectURL(file);
    setFile(blobUrl);
    sessionStorage.setItem("pdfBlobUrl", blobUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`http://localhost:${API_PORT}/add_reviewer`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "File Uploaded",
          description: "Your file has been successfully uploaded.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Upload Failed",
          description: "There was a problem uploading your file.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "An error occurred while uploading the file.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(undefined);
    sessionStorage.removeItem("pdfBlobUrl");
  };

  useEffect(() => {
    if (resetButtonRef.current) {
      resetButtonRef.current.click();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (file) {
        URL.revokeObjectURL(file);
      }
    };
  }, [file]);

  return (
    <Box
      maxW="container.sm"
      mx="auto"
      p={4}
      textAlign="center"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      {!file || uploading ? (
        <Box
          style={{
            width: '100%',
            maxWidth: '600px',
            height: '300px',
            borderWidth: '2px',
            borderColor: dragging ? '#3182ce' : '#e2e8f0',
            borderStyle: 'dashed',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            backgroundColor: dragging ? '#ebf8ff' : 'transparent',
            cursor: 'pointer',
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {uploading ? (
                      <Box textAlign="center">
                      <Spinner size="xl" />
                      <p>Uploading and embedding document...</p>
                    </Box>
          ) : (
            <>
              <Icon as={AiOutlineUpload} boxSize={8} color={dragging ? '#3182ce' : 'gray.500'} />
              <Text mt={2} fontSize="lg" color={dragging ? '#3182ce' : 'gray.500'}>
                Drag & Drop PDF here or click to upload
              </Text>
              <input
                id="file"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <Button
                as="label"
                htmlFor="file"
                variant="solid"
                colorScheme="blue"
                position="absolute"
                bottom={4}
                px={6}
                py={2}
                fontSize="md"
                zIndex={1} // Ensure button is above other content
              >
                Upload PDF
              </Button>
            </>
          )}
        </Box>
      ) : (
        <Box
          style={{
            width: '600px',
            height: '600px',
            resize: 'both',
            overflow: 'auto',
            borderWidth: '1px',
            borderColor: '#e2e8f0',
            borderRadius: '4px',
            position: 'relative',
            padding: '8px',
          }}
        >
          <iframe
            src={file}
            title="PDF Viewer"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
          <Button
            ref={resetButtonRef}
            mt={2}
            colorScheme="red"
            onClick={handleReset}
            size="sm"
            position="absolute"
            bottom={2}
            left={2}
          >
            Reset
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PDFUploaderAndViewer;
