# RecipeMaker Admin Guide

## Overview
This guide explains how to manage the YouTube → Recipe pipeline for RecipeMaker.

## Required API Keys

### 1. YouTube Data API v3 Key
**How to obtain:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "YouTube Data API v3"
4. Navigate to "Credentials" → Create Credentials → API Key
5. Copy the API key

**Usage limits:**
- Free tier: 10,000 quota units/day
- Each video fetch costs ~5 units
- ~2,000 videos/day in free tier

### 2. OpenAI API Key
**How to obtain:**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create new secret key
5. Copy the key immediately (won't be shown again)

**Costs:**
- Whisper transcription: ~$0.006/minute
- GPT-4o-mini extraction: ~$0.01-0.02 per video
- Estimated: $0.03-0.05 per video total

### 3. Admin Email
Set this to your email address for admin panel access.

## System Architecture

```
YouTube Channel → Ingestion → Queue → Processing → Database → Frontend
```

### Components:

1. **Ingestion** (`ingest-youtube` edge function)
   - Fetches videos from YouTube channel
   - Stores metadata in `videos` table
   - Queues videos for processing

2. **Processing** (`process-video` edge function)
   - Transcribes video (simulated with description for now)
   - Extracts recipe structure with GPT
   - Stores results in database

3. **Admin Operations** (`admin-operations` edge function)
   - Backfill management
   - Manual reprocessing
   - Batch processing control

## Database Schema

### Tables:
- **creators**: Channel information
- **videos**: Video metadata and processing status
- **processing_queue**: Queue for video processing
- **processing_jobs**: Batch job tracking
- **cost_tracking**: API usage and cost monitoring

### Video Status Flow:
```
ingested → queued → processing → done
                              ↓
                            error (max 3 retries)
```

## Admin Panel Usage

Access: `/admin`

### Initial Setup:
1. Enter admin email (must match ADMIN_EMAIL secret)
2. Click "Access Admin Panel"

### Dashboard Features:

#### Stats Cards
- **Total Videos**: All videos in database
- **Status Counts**: Videos by status (queued, processing, done, error)

#### Processing Actions:

**Seed (20 videos)**
- Fetches most recent 20 videos from channel
- Use for initial data population
- Click once, wait for completion

**Backfill (10 videos)**
- Fetches next 10 older videos
- Use after seed to gradually add more recipes
- Safe for cost control

**Process Next 5**
- Processes 5 queued videos
- Batch processing for cost/time control
- Monitor progress in queue section

#### Processing Queue
- Shows all queued/processing videos
- Displays status, attempts, errors
- **Reprocess** button for failed videos

## Recommended Workflow

### Day 1: Initial Seed
```
1. Run "Seed (20 videos)" 
   → Wait for ingestion (1-2 min)
   
2. Run "Process Next 5" 
   → Wait for processing (2-5 min)
   → Monitor costs
   
3. Check results on homepage
   → Verify recipe quality
   
4. Repeat "Process Next 5" until all seeded videos are processed
```

### Ongoing: Gradual Backfill
```
Daily or weekly:
1. Run "Backfill (10 videos)"
2. Process in batches of 5-10
3. Monitor costs in cost_tracking table
```

### Handling Errors
```
1. Check Processing Queue for failed items
2. Review error message
3. Click "Reprocess" button
4. If consistently failing, check:
   - API keys are valid
   - Video is accessible
   - Transcript extraction working
```

## Cost Management

### Monitoring Costs:
```sql
-- Total estimated cost
SELECT 
  SUM(estimated_cost) as total_cost,
  operation_type
FROM cost_tracking
GROUP BY operation_type;

-- Cost per video
SELECT 
  v.video_id,
  v.title,
  SUM(c.estimated_cost) as video_cost
FROM videos v
JOIN cost_tracking c ON c.video_id = v.id
GROUP BY v.id;
```

### Cost Controls:
- **Batch size**: Keep at 5-10 for testing
- **Daily quotas**: Monitor OpenAI dashboard
- **YouTube API**: Track quota in Google Cloud Console

### Estimated Costs (per 100 videos):
- YouTube API: Free (within quota)
- Transcription: $0.60 (assuming 10 min/video)
- Extraction: $1.50
- **Total: ~$2.10/100 videos**

## Quality Assurance

### Recipe Validation Checklist:
- [ ] Title extracted correctly
- [ ] Ingredients list is complete
- [ ] Steps are in order
- [ ] Taste tags are accurate
- [ ] Cuisine is correct
- [ ] Meal type matches content
- [ ] Prep time is reasonable
- [ ] Difficulty is appropriate

### Manual Editing:
Use the admin edit feature (coming soon) to fix:
- Incorrect ingredients
- Missing steps
- Wrong categorization

## Troubleshooting

### Issue: No videos being ingested
**Solution:**
1. Check YouTube API key is valid
2. Verify channel ID is correct
3. Check console logs in edge function

### Issue: Processing fails consistently
**Solution:**
1. Verify OpenAI API key
2. Check OpenAI account has credits
3. Review video content (must be recipe-related)

### Issue: Wrong recipe data extracted
**Solution:**
1. Video description quality matters (better descriptions = better extraction)
2. Consider implementing actual video transcription
3. Use manual edit to fix (future feature)

### Issue: Rate limits exceeded
**Solution:**
1. Reduce batch size
2. Add delays between batches
3. Wait for quota reset (YouTube: daily, OpenAI: per-minute)

## Production Improvements

### Current Limitations:
1. **Transcript**: Using video description instead of actual audio
   - To fix: Implement youtube-dl + Whisper integration
   
2. **Batch processing**: Manual triggering
   - To fix: Add cron job for automatic checks every 6 hours

3. **Admin auth**: Client-side check
   - To fix: Implement proper server-side authentication

4. **Channel ID**: Hardcoded
   - To fix: Make configurable per creator

### Future Enhancements:
- [ ] Automatic new video detection
- [ ] Multi-creator support
- [ ] Recipe editing interface
- [ ] User recipe ratings
- [ ] Search with embeddings
- [ ] Recipe recommendations
- [ ] Mobile app

## Support

For issues or questions:
1. Check edge function logs in Lovable Cloud dashboard
2. Review database tables for data integrity
3. Monitor cost_tracking table for usage
4. Contact support@lovable.dev for platform issues

## Updating Channel ID

To change the Sarita's Kitchen channel ID:

```sql
-- Update creator channel ID
UPDATE creators 
SET channel_id = 'YOUR_ACTUAL_CHANNEL_ID_HERE'
WHERE name = 'Sarita''s Kitchen';
```

Get channel ID from YouTube:
1. Go to channel page
2. View page source
3. Search for "channelId"
4. Copy the UC... string