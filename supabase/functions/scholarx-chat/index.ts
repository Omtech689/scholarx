import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info',
}

const withCors = (response: Response) => {
  corsHeaders['Content-Type'] ||= 'application/json'
  response.headers.set('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
  response.headers.set('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods'])
  response.headers.set('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers'])
  return response
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Get the authenticated user's JWT from the request headers
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return withCors(new Response('Unauthorized', { status: 401 }))

    // 2. Initialize Supabase client to verify the user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user profile data
    const { data: { user }, error } = await supabaseClient.auth.getUser()
    if (error || !user) return withCors(new Response('Invalid User Token', { status: 401 }))

    // 3. Extract the user's ID
    const userId = user.id

    // 4. Parse the request payload from the React frontend
    const body = await req.json()
    const prompt =
      body.prompt ||
      (Array.isArray(body.messages)
        ? body.messages.map((m: any) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`).join('\n')
        : '')

    if (!prompt) {
      return withCors(new Response(JSON.stringify({ error: 'Prompt or messages are required' }), { status: 400 }))
    }

    // 5. Send request to Gemini API, proxying through Helicone
    const heliconeResponse = await fetch('https://gateway.helicone.ai/v1/beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') ?? '',
        'Helicone-Auth': `Bearer ${Deno.env.get('HELICONE_API_KEY')}`,
        'Helicone-User-Id': userId,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    })

    const aiData = await heliconeResponse.json()
    const response = new Response(JSON.stringify(aiData), {
      headers: { 'Content-Type': 'application/json' },
    })
    return withCors(response)
  } catch (error) {
    console.error('scholarx-chat error', error)
    const response = new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
    return withCors(response)
  }
})