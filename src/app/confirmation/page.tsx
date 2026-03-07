import { Suspense } from "react";
import { Center, Loader, Box, Container } from "@mantine/core";
import { Navbar } from "@/components/Navbar";
import { ConfirmationContent } from "./ConfirmationContent";

export default function ConfirmationPage() {
  return (
    <Box>
      <Suspense fallback={
        <Container size="sm" py={100}>
          <Center h={400}>
            <Loader size="xl" />
          </Center>
        </Container>
      }>
        <Navbar />
        <ConfirmationContent />
      </Suspense>
    </Box>
  );
}
