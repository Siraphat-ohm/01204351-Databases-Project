"use client";

import { Card, Grid, GridCol, Center, Group, Stack, Text, Badge, Box, Divider, Button } from "@mantine/core";
import { IconPlaneDeparture } from "@tabler/icons-react";

interface FlightCardProps {
  flight: any;
  cabin: string;
  adults: number;

  isSelectingReturn: boolean;
  tripType: string;
  onSelect: (flight: any) => void;
  formatLocalTime: (date: string) => string;
  formatDuration: (mins: number) => string;
}

export function FlightCard({
  flight,
  cabin,
  adults,

  isSelectingReturn,
  tripType,
  onSelect,
  formatLocalTime,
  formatDuration,
}: FlightCardProps) {
  const cabinKey = cabin?.toLowerCase();
  let seatCategory = "ECONOMY";
  let rawPrice = flight.basePriceEconomy;

  if (cabinKey === "business") {
    seatCategory = "BUSINESS";
    rawPrice = flight.basePriceBusiness;
  } else if (cabinKey === "first class" || cabinKey === "first") {
    seatCategory = "FIRST";
    rawPrice = flight.basePriceFirst;
  }

  const availability = flight.seatAvailability?.[seatCategory];
  const isSoldOut = !availability || availability.available === 0;

  const adultPrice = parseFloat(rawPrice) || 0;

  const total = adultPrice * adults ;

  return (
    <Card
      withBorder
      radius="md"
      p="lg"
      shadow="sm"
      mb="md"
      style={{ opacity: isSoldOut ? 0.6 : 1 }}
    >
      <Grid align="center">
        {/* Left Icon Column */}
        <GridCol span={{ base: 12, sm: 1 }}>
          <Center>
            <IconPlaneDeparture size={30} stroke={1.5} color={isSoldOut ? "gray" : "blue"} />
          </Center>
        </GridCol>

        {/* Center Flight Info Column */}
        <GridCol span={{ base: 12, sm: 7 }}>
          <Group justify="center" wrap="nowrap" px="md" gap="xl">
            <Stack gap={2} align="center" style={{ minWidth: 100 }}>
              <Text fz="xl" fw={800} style={{ whiteSpace: "nowrap" }}>
                {formatLocalTime(flight.departureTime)}
              </Text>
              <Badge variant="light" color="gray" size="sm">
                {flight.route?.origin?.iataCode}
              </Badge>
            </Stack>

            <Stack gap={0} style={{ flex: 1, minWidth: 120 }} align="center">
              <Text size="xs" c="dimmed">
                {formatDuration(flight.route?.durationMins || 0)}
              </Text>
              <Box
                w="100%"
                style={{ borderBottom: "1px solid #e9ecef", position: "relative", margin: "8px 0" }}
              >
                <IconPlaneDeparture
                  size={16}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: -8,
                    transform: "translateX(-50%)",
                    color: "#adb5bd",
                    backgroundColor: "white",
                    padding: "0 4px",
                  }}
                />
              </Box>
              <Text size="xs" fw={700} c={isSoldOut ? "red.6" : "green.7"}>
                {isSoldOut ? "Sold Out" : "Direct"}
              </Text>
            </Stack>

            <Stack gap={2} align="center" style={{ minWidth: 100 }}>
              <Text fz="xl" fw={800} style={{ whiteSpace: "nowrap" }}>
                {formatLocalTime(flight.arrivalTime)}
              </Text>
              <Badge variant="light" color="gray" size="sm">
                {flight.route?.destination?.iataCode}
              </Badge>
            </Stack>
          </Group>
        </GridCol>

        {/* Right Price Column */}
        <GridCol span={{ base: 12, sm: 4 }} style={{ borderLeft: "1px solid #f1f3f5" }}>
          <Stack gap={4} align="flex-end">
            <Group gap={8} justify="flex-end">
              <Text size="xs" c="dimmed">Adults x{adults}</Text>
              <Text fw={700} c="blue.9" fz="xl">
                THB {adultPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </Group>
         
            <Divider w="100%" my={4} />
            <Text size="xs" c="dimmed" tt="uppercase">Total for {adults} Pax</Text>
            <Text fz="xl" fw={900} c="dark">THB {total.toLocaleString()}</Text>
            
            {!isSoldOut && availability.available < 10 && (
              <Text size="xs" c="orange.7" fw={700}>Only {availability.available} seats left!</Text>
            )}

            <Button
              fullWidth
              mt="sm"
              size="md"
              color={isSoldOut ? "gray" : isSelectingReturn ? "orange" : "blue"}
              radius="md"
              disabled={isSoldOut}
              onClick={() => onSelect(flight)}
            >
              {isSoldOut
                ? "Flight Full"
                : tripType === "round-trip" && !isSelectingReturn
                ? "Select Departure"
                : "Book Flight"}
            </Button>
          </Stack>
        </GridCol>
      </Grid>
    </Card>
  );
}