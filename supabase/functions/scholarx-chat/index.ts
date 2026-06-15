import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, accept',
  'Access-Control-Expose-Headers': 'Content-Type',
}

const withCors = (response: Response) => {
  response.headers.set('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'])
  response.headers.set('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods'])
  response.headers.set('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers'])
  response.headers.set('Access-Control-Expose-Headers', corsHeaders['Access-Control-Expose-Headers'])
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
    if (!authHeader) {
      return withCors(
        new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }

    // 2. Initialize Supabase client to verify the user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user profile data
    const authResult = await supabaseClient.auth.getUser()
    const user = authResult.data?.user
    if (authResult.error || !user) {
      console.error('Invalid user token', authResult.error)
      return withCors(
        new Response(JSON.stringify({ error: 'Invalid User Token', details: authResult.error?.message ?? null }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }

    // 3. Extract the user's ID
    const userId = user.id

    // 4. Parse the request payload from the React frontend
    let body: any = {}
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('Invalid JSON body', parseError)
      return withCors(new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 }))
    }

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

    if (!heliconeResponse.ok) {
      const text = await heliconeResponse.text().catch(() => '')
      console.error('Helicone error', heliconeResponse.status, text)
      return withCors(
        new Response(JSON.stringify({ error: `Helicone request failed (${heliconeResponse.status})` }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }

    const aiData = await heliconeResponse.json().catch((parseError) => {
      console.error('Failed to parse Helicone response', parseError)
      return null
    })

    if (aiData === null) {
      return withCors(
        new Response(JSON.stringify({ error: 'Invalid response from Helicone' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }

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