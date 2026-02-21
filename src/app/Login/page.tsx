"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Container,
  Anchor,
  Stack,
  Alert,
  LoadingOverlay,
  Box,
  Group,
} from "@mantine/core";
import { 
  IconAlertCircle, 
  IconAt, 
  IconLock, 
  IconEye, 
  IconEyeOff 
} from "@tabler/icons-react";
import { signInWithEmail, signUpWithEmail } from "@/services/auth-client.service";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get("callbackURL") || "/";

  const [type, setType] = useState<"login" | "register">("login");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setSuccess(null); // Clear previous success messages

  if (type === "register" && password !== confirmPassword) {
    setError("Passwords do not match.");
    return;
  }

  setLoading(true);

  try {
    if (type === "login") {
      const result = await signInWithEmail({ email, password, callbackURL });
      if (result.ok) {
        router.push(callbackURL);
        router.refresh();
      } else {
        setError(result.error);
      }
    } else {
      // REGISTRATION LOGIC
      const result = await signUpWithEmail({ 
        email, 
        password, 
        name: email.split('@')[0] 
      });

      if (result.ok) {
        // SUCCESS: Switch to login mode
        setType("login");
        
        // IMPORTANT: Clear password fields so they are empty for the login attempt
        setPassword("");
        setConfirmPassword("");
        
        // Show a success message so the user knows why they were switched
        setSuccess("Account created successfully! Please log in.");
      } else {
        setError(result.error);
      }
    }
  } catch (err) {
    setError("An unexpected error occurred.");
  } finally {
    setLoading(false);
  }
};

  const renderVisibilityIcon = ({ reveal }: { reveal: boolean }) => 
    reveal ? <IconEyeOff size={18} stroke={1.5} /> : <IconEye size={18} stroke={1.5} />;

  return (
    <Box bg="gray.0" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container p={0}>
        <Title ta="center" fw={900} order={2} mb="xs">
          YokAirlines
        </Title>
        <Text c="dimmed" size="sm" ta="center" mb={25}>
          {type === "login" ? "Sign in to your account" : "Register for a new account"}
        </Text>

        {/* Fixed width set here (400px) ensures no width-snapping */}
        <Paper withBorder shadow="md" p={30} radius="md" pos="relative" w={400}>
          <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
          
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" py="xs">
                  {error}
                </Alert>
              )}

              <TextInput
                label="Email Address"
                placeholder="hello@example.com"
                required
                leftSection={<IconAt size={16} stroke={1.5} />}
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
              />

              <PasswordInput
                label="Password"
                placeholder="Your password"
                required
                leftSection={<IconLock size={16} stroke={1.5} />}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                visibilityToggleIcon={renderVisibilityIcon}
              />

              {type === "register" && (
                <PasswordInput
                  label="Confirm Password"
                  placeholder="Repeat your password"
                  required
                  leftSection={<IconLock size={16} stroke={1.5} />}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                  visibilityToggleIcon={renderVisibilityIcon}
                  error={password !== confirmPassword && confirmPassword.length > 0}
                />
              )}
            </Stack>

            <Button type="submit" fullWidth mt="xl" size="md" radius="md">
              {type === "login" ? "Login" : "Register"}
            </Button>
          </form>

          <Group justify="center" mt="xl">
            <Anchor 
              size="sm" 
              component="button" 
              onClick={() => {
                setType(type === "login" ? "register" : "login");
                setError(null);
              }}
            >
              {type === "login" ? "Create an account" : "Back to Login"}
            </Anchor>
          </Group>
        </Paper>
      </Container>
    </Box>
  );
}