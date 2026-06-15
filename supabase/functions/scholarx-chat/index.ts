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

    // 5. Send request to Gemini API, proxying through Helicone using OpenAI-compatible chat completions.
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
    if (!GEMINI_API_KEY) {
      return withCors(
        new Response(JSON.stringify({ error: 'AI is not configured.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }

    const heliconeUrl = 'https://gateway.helicone.ai/v1beta/openai/chat/completions'
    const heliconeResponse = await fetch(heliconeUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
        'Helicone-Auth': `Bearer ${Deno.env.get('HELICONE_API_KEY')}`,
        'Helicone-Target-URL': 'https://generativelanguage.googleapis.com',
        'Helicone-User-Id': userId,
        'Helicone-Property-Feature': 'chat',
      },
      body: JSON.stringify({
        model: 'gemini-3.1-flash-lite',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    })

    if (!heliconeResponse.ok) {
      const text = await heliconeResponse.text().catch(() => '')
      console.error('Helicone error', heliconeResponse.status, text)
      return withCors(
        new Response(JSON.stringify({ error: `Helicone request failed (${heliconeResponse.status})`, detail: text }), {
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

    const content = aiData?.choices?.[0]?.message?.content ?? aiData?.choices?.[0]?.text ?? ''
    const responseBody = content ? { content } : { error: 'Empty AI response', raw: aiData }
    const response = new Response(JSON.stringify(responseBody), {
      headers: { 'Content-Type': 'application/json' },
      status: content ? 200 : 502,
    })
    return withCors(response)
  } catch (error) {
    console.error('scholarx-chat error', error)
    const response = new Response(JSON.stringify({ error: 'Internal server error', detail: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
    return withCors(response)
  }
})