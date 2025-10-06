# Social Media Business Search

Enhanced web search tool with social media business account discovery capabilities.

## Overview

The web search tool now includes powerful social media search functionality that allows you to find business accounts across multiple platforms including TikTok, Instagram, Facebook, Twitter, LinkedIn, and YouTube.

## Features

### 🔍 **Multi-Platform Search**
- **TikTok**: Find business accounts and creators
- **Instagram**: Discover business pages and profiles
- **Facebook**: Locate business pages and groups
- **Twitter/X**: Find business accounts and handles
- **LinkedIn**: Discover company pages and professional profiles
- **YouTube**: Find business channels and creators

### 🏢 **Business Account Detection**
- Automatically identifies business accounts vs personal accounts
- Detects business indicators like "shop", "restaurant", "salon", "clinic"
- Identifies professional services and commercial entities

### 📊 **Engagement Analysis**
- Extracts follower counts and engagement metrics
- Identifies active accounts with recent posts
- Detects contact information and business details

### 🎯 **Smart Query Parsing**
- Automatically detects platform from query
- Extracts business type from search terms
- Supports natural language queries

## Usage Examples

### Basic Social Media Search

```python
# Search for barber shops on TikTok
result = await web_search_tool.execute(
    query="barber shop tiktok",
    result_type="social_media",
    max_results=5
)

# Search for restaurants on Instagram
result = await web_search_tool.execute(
    query="restaurant instagram",
    result_type="social_media",
    max_results=3
)
```

### Platform-Specific Queries

```python
# Find coffee shops on Facebook
result = await web_search_tool.execute(
    query="coffee shop facebook",
    result_type="social_media"
)

# Discover gyms on LinkedIn
result = await web_search_tool.execute(
    query="gym linkedin",
    result_type="social_media"
)
```

### Cross-Platform Discovery

```python
# Find salons across all platforms
result = await web_search_tool.execute(
    query="salon",
    result_type="social_media"
)
```

## Query Examples

### 🎯 **Effective Queries**
- `"barber shop tiktok"` - Find barber shops on TikTok
- `"restaurant instagram"` - Discover restaurants on Instagram
- `"coffee shop facebook"` - Locate coffee shops on Facebook
- `"salon twitter"` - Find salons on Twitter/X
- `"gym linkedin"` - Discover gyms on LinkedIn
- `"bakery youtube"` - Find bakeries on YouTube

### 🔧 **Query Format**
- **Business Type + Platform**: `"business_type platform"`
- **Platform + Business Type**: `"platform business_type"`
- **Business Type Only**: `"business_type"` (searches all platforms)

## Result Format

Each social media search result includes:

```json
{
  "title": "Business Name",
  "url": "https://platform.com/username",
  "snippet": "Business description and details",
  "type": "social_media",
  "platform": "tiktok|instagram|facebook|twitter|linkedin|youtube",
  "business_type": "extracted business type",
  "username": "@username or username",
  "is_business_account": true,
  "engagement_indicators": {
    "has_followers": true,
    "has_posts": true,
    "has_engagement": true,
    "mentions_contact": true
  }
}
```

## Supported Platforms

### 📱 **TikTok**
- **URL Pattern**: `tiktok.com/@username`
- **Username Format**: `@username`
- **Business Detection**: Creator accounts, business profiles

### 📸 **Instagram**
- **URL Pattern**: `instagram.com/username`
- **Username Format**: `@username`
- **Business Detection**: Business accounts, creator accounts

### 👥 **Facebook**
- **URL Pattern**: `facebook.com/username`
- **Username Format**: `username`
- **Business Detection**: Business pages, groups

### 🐦 **Twitter/X**
- **URL Pattern**: `twitter.com/username` or `x.com/username`
- **Username Format**: `@username`
- **Business Detection**: Business accounts, verified accounts

### 💼 **LinkedIn**
- **URL Pattern**: `linkedin.com/in/username`
- **Username Format**: `username`
- **Business Detection**: Company pages, professional profiles

### 📺 **YouTube**
- **URL Pattern**: `youtube.com/c/username` or `youtube.com/@username`
- **Username Format**: `@username` or `username`
- **Business Detection**: Business channels, creator channels

## Business Account Detection

The tool automatically identifies business accounts by looking for:

### 🏢 **Business Keywords**
- `business`, `shop`, `store`, `restaurant`, `cafe`, `bar`
- `salon`, `barber`, `clinic`, `office`, `company`
- `services`, `professional`, `official`

### 📞 **Contact Information**
- `contact`, `call`, `email`, `phone`
- `book`, `appointment`, `order`, `menu`
- `hours`, `location`, `address`

### 📊 **Engagement Indicators**
- Follower counts and engagement metrics
- Recent posts and activity
- Business-specific content

## Advanced Features

### 🔍 **Smart Platform Detection**
- Automatically detects platform from URL
- Falls back to query analysis
- Supports multiple platform formats

### 📈 **Engagement Analysis**
- Identifies active accounts
- Detects engagement patterns
- Extracts follower information

### 🎯 **Business Type Extraction**
- Automatically extracts business type from queries
- Removes platform keywords
- Cleans up common words

## Error Handling

The tool includes comprehensive error handling:

- **Network errors**: Graceful fallbacks and retries
- **Parse errors**: Safe error messages
- **Rate limiting**: Automatic backoff
- **Invalid queries**: Helpful error messages

## Performance Tips

1. **Use specific queries**: `"barber shop tiktok"` vs `"barber"`
2. **Limit results**: Use `max_results` parameter appropriately
3. **Platform-specific**: Specify platform for better results
4. **Business keywords**: Include business-related terms

## Integration Examples

### 🤖 **AI Agent Integration**
```python
# AI agent can now search for business accounts
agent_response = await agent.execute(
    "Find me barber shops on TikTok in my area"
)
```

### 🔍 **Research Use Cases**
- Competitor analysis
- Market research
- Lead generation
- Social media monitoring

### 📊 **Business Intelligence**
- Industry analysis
- Trend identification
- Engagement benchmarking
- Market mapping

## Limitations

- **Public accounts only**: Cannot access private accounts
- **Rate limiting**: Subject to search engine rate limits
- **Platform changes**: URLs and formats may change
- **Content availability**: Depends on search engine indexing

## Future Enhancements

- **API Integration**: Direct platform API access
- **Real-time data**: Live follower counts and metrics
- **Content analysis**: Post content and engagement analysis
- **Geographic filtering**: Location-based search
- **Industry categorization**: Automatic business categorization

## Support

For issues or questions about the social media search functionality:

1. Check the query format and examples
2. Verify platform names are correct
3. Try different business type keywords
4. Use more specific queries for better results

---

**Note**: This feature enhances the existing web search tool and maintains all original functionality while adding powerful social media business discovery capabilities.
