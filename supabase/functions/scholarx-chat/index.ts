import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // 1. Get the authenticated user's JWT from the request headers
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  // 2. Initialize Supabase client to verify the user
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  // Get user profile data
  const { data: { user }, error } = await supabaseClient.auth.getUser()
  if (error || !user) return new Response('Invalid User Token', { status: 401 })

  // 3. Extract the user's ID
  const userId = user.id 

  // 4. Get the prompt payload from your React frontend request
  const { prompt } = await req.json()

  // 5. Send request to Gemini API, but proxy it through Helicone's Gateway
  const heliconeResponse = await fetch('https://gateway.helicone.ai/v1/beta/models/gemini-1.5-flash:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') ?? '',
      // HELICONE SPECIFIC HEADERS:
      'Helicone-Auth': `Bearer ${Deno.env.get('HELICONE_API_KEY')}`,
      'Helicone-User-Id': userId, // Tracks costs and metrics per individual student
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  })

  const aiData = await heliconeResponse.json()
  
  // Return the AI response back to your React app
  return new Response(JSON.stringify(aiData), {
    headers: { 'Content-Type': 'application/json' }
  })
})