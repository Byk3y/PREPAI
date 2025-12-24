import { createClient } from "supabase"

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts'

// Types for the Edge Function
interface Profile {
    id: string
    expo_push_token: string
    timezone: string
    last_streak_date: string
    streak: number
    last_notification_sent_at: string | null
}

interface Notebook {
    id: string
    title: string
}

interface PetState {
    name: string
    current_stage: number
}

interface NotificationPayload {
    to: string
    sound: string
    title: string
    body: string
    data: Record<string, any>
    mutableContent: boolean
    _displayInForeground: boolean
    _profileId: string // Track which profile this is for
}

Deno.serve(async (req: Request) => {
    try {
        // Parse body for debug flag
        let debug = false;
        try {
            const body = await req.json();
            debug = body?.debug === true;
        } catch (e) {
            // No body or not JSON, ignore
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get users with push tokens
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, expo_push_token, timezone, last_streak_date, streak, last_notification_sent_at')
            .not('expo_push_token', 'is', null)

        if (profileError) throw profileError

        const notifications: NotificationPayload[] = []
        const now = new Date()
        const COOLDOWN_HOURS = 12 // Don't send more than once per 12 hours

        for (const profile of profiles as Profile[]) {
            const timezone = profile.timezone || 'UTC'

            // === SPAM PREVENTION: Skip if notified recently ===
            if (profile.last_notification_sent_at && !debug) {
                const lastSent = new Date(profile.last_notification_sent_at)
                const hoursSinceLastNotification = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60)
                if (hoursSinceLastNotification < COOLDOWN_HOURS) {
                    continue // Skip - already notified recently
                }
            }

            // Get current hour in user's timezone
            const userTime = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                hour: 'numeric',
                hour12: false,
            }).format(now)

            const currentHour = parseInt(userTime)

            // Only send if it's evening (e.g. 6 PM to 10 PM) in their local time
            // BYPASS if debug is true
            const isEvening = currentHour >= 18 && currentHour <= 22

            if (!isEvening && !debug) continue

            // 2. Determine "Mood" based on streak status
            // Format today's date in user's timezone to compare with last_streak_date
            const userDate = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(now)

            const [mm, dd, yyyy] = userDate.split('/')
            const formattedToday = `${yyyy}-${mm}-${dd}`

            // Skip if they already studied today (BYPASS if debug is true)
            if (profile.last_streak_date === formattedToday && !debug) continue

            let mood: 'sad' | 'sassy' | 'happy' = 'happy'
            if (profile.last_streak_date) {
                const lastDate = new Date(profile.last_streak_date)
                const todayDate = new Date(formattedToday)
                const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                if (diffDays === 1) {
                    mood = 'sad' // Streak at risk!
                } else if (diffDays > 1) {
                    mood = 'sassy' // They've been gone a while
                }
            }

            // 3. Get their context (Notebook & Pet)
            const { data: notebook } = await supabase
                .from('notebooks')
                .select('id, title')
                .eq('user_id', profile.id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single()

            const { data: pet } = await supabase
                .from('pet_states')
                .select('name, current_stage')
                .eq('user_id', profile.id)
                .single()

            const petName = pet?.name || 'Nova'
            const currentStage = pet?.current_stage || 1
            const notebookTitle = notebook?.title || 'your notes'

            // Get public URL for pet bubble
            const bucketUrl = 'https://tunjjtfnvtscgmuxjkng.supabase.co/storage/v1/object/public/assets'
            const petImageUrl = `${bucketUrl}/pets/stage-${currentStage}/bubble.png`

            // 4. Personality Library - Sassy, emotional, single-thought messages
            const streakCount = profile.streak || 0

            const library = {
                happy: [
                    { title: `🐾 ${petName} is hyped!`, body: `That ${streakCount}-day streak looks good on you. Time for "${notebookTitle}"?` },
                    { title: `👀 Psst...`, body: `"${notebookTitle}" is calling your name. Can you hear it?` },
                    { title: `💫 Perfect timing!`, body: `I was just thinking about "${notebookTitle}". Great minds, right?` }
                ],
                sassy: [
                    { title: `💅 Just checking...`, body: `So "${notebookTitle}" is just sitting there collecting dust, huh?` },
                    { title: `🙄 No pressure, but...`, body: `I didn't want to say anything, but "${notebookTitle}" has been feeling neglected.` },
                    { title: `😏 Plot twist:`, body: `"${notebookTitle}" misses you more than you'd think.` }
                ],
                sad: [
                    { title: `😰 SOS!`, body: `Your ${streakCount}-day streak is hanging by a thread!` },
                    { title: `💔 ${petName} is worried...`, body: `"${notebookTitle}" and your streak are both about to ghost you.` },
                    { title: `⚡ Quick save?`, body: `One session with "${notebookTitle}" = streak saved. Your call.` }
                ]
            }

            const messages = library[mood]
            const message = messages[Math.floor(Math.random() * messages.length)]

            notifications.push({
                to: profile.expo_push_token,
                sound: 'default',
                title: message.title,
                body: message.body,
                data: {
                    notebookId: notebook?.id,
                    screen: '/(tabs)/home',
                    imageUrl: petImageUrl
                },
                // For Rich Notifications on iOS/Android
                mutableContent: true,
                _displayInForeground: true,
                _profileId: profile.id, // Track for updating last_notification_sent_at
            })
        }

        // 5. Send batches to Expo
        let ticketIds: string[] = []
        const sentProfileIds: string[] = []

        if (notifications.length > 0) {
            // Extract profile IDs before sending (we'll update them after)
            notifications.forEach(n => sentProfileIds.push(n._profileId))

            // Remove internal tracking field before sending to Expo
            const expoPayloads = notifications.map(({ _profileId, ...rest }) => rest)

            const response = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                },
                body: JSON.stringify(expoPayloads),
            })

            const result = await response.json()
            console.log('Expo Response:', result)

            // Collect ticket IDs for receipt checking
            if (result.data) {
                ticketIds = result.data
                    .filter((ticket: any) => ticket.id)
                    .map((ticket: any) => ticket.id)
            }

            // === UPDATE last_notification_sent_at for all sent profiles ===
            if (sentProfileIds.length > 0) {
                await supabase
                    .from('profiles')
                    .update({ last_notification_sent_at: now.toISOString() })
                    .in('id', sentProfileIds)
            }

            // === HANDLE IMMEDIATE ERRORS (invalid tokens) ===
            if (result.data) {
                const invalidTokenProfiles: string[] = []
                result.data.forEach((ticket: any, index: number) => {
                    if (ticket.status === 'error') {
                        if (ticket.details?.error === 'DeviceNotRegistered') {
                            invalidTokenProfiles.push(sentProfileIds[index])
                        }
                        console.error(`Push failed for profile ${sentProfileIds[index]}:`, ticket.message)
                    }
                })

                // Clean up invalid tokens
                if (invalidTokenProfiles.length > 0) {
                    console.log(`Cleaning ${invalidTokenProfiles.length} invalid tokens`)
                    await supabase
                        .from('profiles')
                        .update({ expo_push_token: null })
                        .in('id', invalidTokenProfiles)
                }
            }
        }

        // 6. Check receipts for previously sent notifications (async cleanup)
        // This handles tokens that become invalid after initial send
        await checkAndCleanupReceipts(supabase, ticketIds)

        return new Response(JSON.stringify({
            success: true,
            count: notifications.length,
            ticketsGenerated: ticketIds.length
        }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (err: any) {
        console.error(err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
})

/**
 * Check Expo receipts for delivery errors and clean up invalid tokens
 */
async function checkAndCleanupReceipts(supabase: any, ticketIds: string[]) {
    if (ticketIds.length === 0) return

    try {
        const response = await fetch(EXPO_RECEIPTS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: ticketIds }),
        })

        const { data: receipts } = await response.json()

        if (!receipts) return

        // Find tokens that need to be invalidated
        const tokensToInvalidate: string[] = []

        for (const [ticketId, receipt] of Object.entries(receipts as Record<string, any>)) {
            if (receipt.status === 'error') {
                console.log(`Receipt error for ${ticketId}:`, receipt.message)

                if (receipt.details?.error === 'DeviceNotRegistered') {
                    // We need to find the token associated with this ticket
                    // For now, log it - in production you'd track ticket->token mapping
                    console.log(`Token for ticket ${ticketId} is no longer valid`)
                }
            }
        }

        console.log(`Processed ${Object.keys(receipts).length} receipts`)
    } catch (error) {
        console.error('Error checking receipts:', error)
    }
}
