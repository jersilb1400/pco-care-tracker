import { Box, Card, CardContent, Typography, Button } from '@mui/material';
import Link from 'next/link';

export default function Home() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#1a4bb7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Card sx={{ maxWidth: 480, width: '100%', borderRadius: 3, boxShadow: 3 }}>
        <CardContent sx={{ textAlign: 'center', p: 5 }}>
          {/* Optional: Add your logo here */}
          {<img src="/gracefm.png" alt="Logo" style={{ width: 80, marginBottom: 24 }} /> }
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Welcome to Congregational Care
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Submit a care need, track requests, and help us serve our congregation better.
          </Typography>
          <Link href="/intake" passHref>
            <Button
              variant="contained"
              color="primary"
              sx={{
                bgcolor: '#0073ea',
                fontWeight: 600,
                fontSize: 18,
                px: 5,
                py: 1.5,
                borderRadius: 2,
                boxShadow: 2,
                textTransform: 'none',
              }}
              size="large"
            >
              Start a Care Request
            </Button>
          </Link>
        </CardContent>
      </Card>
    </Box>
  );
}