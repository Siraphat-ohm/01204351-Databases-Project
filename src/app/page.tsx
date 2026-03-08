import { Suspense } from 'react';
import { Container, Grid, GridCol, Box, Title, Text, Center, Loader } from '@mantine/core';
import { Navbar } from '@/components/Navbar';
import { FlightSearchBox } from '@/components/FlightSearchBox';

export default async function Page() {
  return (
    <Suspense fallback={
      <Box h="100vh">
        <Center h="100%">
          <Loader size="xl" />
        </Center>
      </Box>
    }>
      <Navbar />
      <LandingContent />
    </Suspense>
  );
}

function LandingContent() {
  return (
    <Box>
      <Box 
        style={{ 
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url("https://www.agoda.com/wp-content/uploads/2019/10/Bangkok-touristst-trip-Thailand.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: 'calc(100vh - 60px)',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Container size="xl" style={{ width: '100%' }}>
          <Grid align="center">
            <GridCol span={{ base: 12, md: 7 }}>
              <Title order={1} c="white" size="4rem" style={{ lineHeight: 1.1 }}>
                Explore the World <br /> With YokAirlines
              </Title>
              <Text c="white" mt="md" size="lg">
                Safe, fast, and reliable flights at your fingertips.
              </Text>
            </GridCol>

            <GridCol span={{ base: 12, md: 5 }}>
              <FlightSearchBox />
            </GridCol>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
