import {
  Box,
  Heading,
  HStack,
  useDisclosure,
  Collapse,
  IconButton,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';

export default function ContentBox({ title, children }: { title: string; children: React.ReactNode }) {
  // Initialize `isOpen` as true to start off expanded
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });

  return (
    <Box  // Main Box
      className="rounded-md border border-gray-300 p-4 mb-4"
      userSelect="none" // Prevent text selection on this element
    >
      <HStack borderRadius="md" justify="space-between" mb={2} align="center">
        <Heading size="md">{title}</Heading>
        <IconButton
          aria-label={isOpen ? 'Minimize' : 'Expand'}
          icon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          size="sm"
          variant="ghost"
          onClick={onToggle}
        />
      </HStack>
      <Collapse in={isOpen} animateOpacity>
        <Box
          borderRadius="md"
          userSelect="text" // Allow text selection within content
          style={{
            visibility: isOpen ? 'visible' : 'hidden',
          }}
        >
          {children} 
        </Box>
      </Collapse>
    </Box>
  );
}
