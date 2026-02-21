// app/admin/login/page.tsx
"use client";

import { useState } from "react";
import { 
  TextInput, 
  PasswordInput, 
  Button, 
  Paper, 
  Title, 
  Container, 
  Text, 
  Alert,
  Center,
  Box
} from "@mantine/core";
import { IconAlertCircle, IconLock } from "@tabler/icons-react";
import  { signIn }  from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    // Authenticate the user 
    const { data, error } = await signIn.email({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message || "Invalid credentials. Please try again.");
      setLoading(false);
      return;
    } 

    // If successful, push them to the protected admin dashboard.
    // The (protected)/layout.tsx will instantly intercept this and check 
    // if their role is actually "ADMIN". If not, it will bounce them back here!
    router.push("/admin/dashboard");
  };

  return (
    <Box 
      bg="var(--mantine-color-gray-0)" 
      mih="100vh" 
      style={{ display: 'flex', alignItems: 'center' }}
    >
      <Container size={420} w="100%">
        <Center mb="md">
          <IconLock size={40} color="var(--mantine-color-blue-6)" />
        </Center>
        <Title ta="center" order={2}>
          Admin Portal
        </Title>
        <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
          Authorized personnel only.
        </Text>

        <Paper withBorder shadow="md" p={30} radius="md">
          {errorMsg && (
            <Alert 
              icon={<IconAlertCircle size={16} />} 
              title="Access Denied" 
              color="red" 
              variant="light"
              mb="md"
            >
              {errorMsg}
            </Alert>
          )}

          <form onSubmit={handleAdminLogin}>
            <TextInput 
              label="Admin Email" 
              placeholder="admin@yourcompany.com" 
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required 
            />
            <PasswordInput 
              label="Password" 
              placeholder="Enter your password" 
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required 
              mt="md" 
            />
            <Button 
              fullWidth 
              mt="xl" 
              size="md" 
              type="submit" 
              loading={loading}
            >
              Secure Login
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}