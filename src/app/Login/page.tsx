import { AuthenticationForm } from '@/components/AuthenticationForm';
import { Center, Box } from '@mantine/core';

export default function LoginPage() {
  return (
    <Box 
      style={{ 
        minHeight: '100vh', 
        backgroundColor: 'var(--mantine-color-gray-0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <AuthenticationForm />
    </Box>
  );
}