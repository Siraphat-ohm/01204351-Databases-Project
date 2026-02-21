'use client';

import { Group, Paper, Text, ScrollArea, UnstyledButton, Stack, Loader, Center } from '@mantine/core';

interface PriceStripProps {
  startDate: Date | null;
  onDateChange: (date: Date) => void;
  // New props for real data
  prices: Record<string, number | null>; 
  loading?: boolean;
}

export function PriceStrip({ startDate, onDateChange, prices, loading }: PriceStripProps) {
  const activeDate = startDate instanceof Date ? startDate : new Date();

  const generateDateStrip = (baseDate: Date) => {
    const strip = [];
    for (let i = -3; i < 4; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      strip.push(d);
    }
    return strip;
  };

  const dates = generateDateStrip(activeDate);

  return (
    <Group gap={0} mb="lg">
      <Paper withBorder radius="md" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ScrollArea style={{ flex: 1 }} scrollbars="x" type="never">
          <Group gap={0} wrap="nowrap">
            {loading ? (
              <Center w="100%" h={60}><Loader size="sm" color="teal" /></Center>
            ) : (
              dates.map((date) => {
const dateKey = date.toISOString().split('T')[0]; 

// Debugging: Log this to your console to see if it matches your API object keys
// console.log("Generated Key:", dateKey, "Available Keys:", Object.keys(prices));

const isSelected = activeDate.toDateString() === date.toDateString();
const price = prices[dateKey];
const priceValue = prices[dateKey];
const displayPrice = (priceValue !== null && !isNaN(Number(priceValue))) 
  ? Math.round(Number(priceValue)) 
  : null;
                return (
                  <UnstyledButton
                    key={dateKey}
                    onClick={() => onDateChange(date)}
                    p="xs"
                    style={{
                      minWidth: 120,
                      textAlign: 'center',
                      borderRight: '1px solid #dee2e6',
                      backgroundColor: isSelected ? 'var(--mantine-color-teal-0)' : 'transparent',
                      borderBottom: isSelected ? '3px solid var(--mantine-color-teal-9)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed">
                        {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </Text>
                  <Text fw={700} size="sm" c={price ? (isSelected ? 'teal.9' : 'black') : 'gray.4'}>
                        {displayPrice ? `THB ${displayPrice.toLocaleString()}` : '—'}
                        </Text>
                    </Stack>
                  </UnstyledButton>
                );
              })
            )}
          </Group>
        </ScrollArea>
      </Paper>
    </Group>
  );
}