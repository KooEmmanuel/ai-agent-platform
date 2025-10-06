# Enhanced Web Search Tool - AI Agent Usage Guide

## Overview

The Web Search tool has been significantly enhanced with advanced business discovery capabilities. AI agents can now find businesses across social media platforms and business directories with comprehensive business intelligence.

## New Capabilities

### 🎯 **Business Discovery Features**
- **Social Media Business Search**: Find business accounts on TikTok, Instagram, Facebook, Twitter, LinkedIn, YouTube
- **Business Directory Search**: Search across Yelp, Google Business, Vagaro, Yellow Pages, and 15+ other platforms
- **Business Intelligence**: Extract contact info, hours, reviews, booking capabilities
- **Cross-platform Discovery**: Find businesses across multiple platforms simultaneously

## Usage for AI Agents

### **Basic Usage Pattern**
```python
# For business discovery, always use result_type="social_media"
result = await web_search_tool.execute(
    query="business_type platform",
    result_type="social_media",
    max_results=5
)
```

### **Query Format Guidelines**

#### **Social Media Business Search**
- Format: `"business_type platform"`
- Examples:
  - `"barber shop tiktok"` - Find barber shops on TikTok
  - `"restaurant instagram"` - Find restaurants on Instagram
  - `"salon facebook"` - Find salons on Facebook
  - `"gym linkedin"` - Find gyms on LinkedIn
  - `"bakery youtube"` - Find bakeries on YouTube

#### **Business Directory Search**
- Format: `"business_type directory_platform"`
- Examples:
  - `"barber shop yelp"` - Find barber shops on Yelp
  - `"restaurant google business"` - Find restaurants on Google Business
  - `"salon vagaro"` - Find salons on Vagaro
  - `"gym yellow pages"` - Find gyms on Yellow Pages

#### **Cross-Platform Discovery**
- Format: `"business_type"` (no platform specified)
- Examples:
  - `"coffee shop"` - Find coffee shops across all platforms
  - `"barber shop"` - Find barber shops across social media and directories
  - `"restaurant"` - Find restaurants everywhere

## Supported Platforms

### **Social Media Platforms**
- **TikTok** - Short-form video content
- **Instagram** - Photo and video sharing
- **Facebook** - Social networking and business pages
- **Twitter/X** - Microblogging and business accounts
- **LinkedIn** - Professional networking and company pages
- **YouTube** - Video content and business channels

### **Business Directories**
- **Yelp** - Restaurant and business reviews
- **Google Business** - Google Maps business listings
- **Vagaro** - Beauty and wellness booking
- **Yellow Pages** - Traditional business directory
- **SuperPages** - Online business directory
- **WhitePages** - Business and residential listings
- **Manta** - B2B business directory
- **Local.com** - Local business search
- **CitySearch** - City-specific business listings
- **Foursquare** - Location-based discovery
- **TripAdvisor** - Travel and hospitality
- **Zomato** - Restaurant and food service
- **OpenTable** - Restaurant reservations
- **Resy** - Restaurant booking platform
- **Booker** - Appointment booking platform
- **MindBody** - Wellness and fitness booking
- **Acuity** - Appointment scheduling
- **Square** - Business management platform

## Result Types and Data

### **Social Media Results**
```json
{
  "type": "social_media",
  "platform": "tiktok|instagram|facebook|twitter|linkedin|youtube",
  "username": "@username",
  "is_business_account": true,
  "engagement_indicators": {
    "has_followers": true,
    "has_posts": true,
    "has_engagement": true,
    "mentions_contact": true
  }
}
```

### **Business Directory Results**
```json
{
  "type": "business_directory",
  "platform": "yelp|google_business|vagaro|yellow_pages|etc",
  "business_info": {
    "has_phone": true,
    "has_address": true,
    "has_hours": true,
    "has_website": true,
    "has_reviews": true,
    "has_menu": true,
    "has_booking": true,
    "has_photos": true,
    "has_directions": true
  }
}
```

## AI Agent Implementation Examples

### **Example 1: Find Barber Shop TikTok Accounts**
```python
# User asks: "Find me barber shops on TikTok"
result = await web_search_tool.execute(
    query="barber shop tiktok",
    result_type="social_media",
    max_results=5
)

# Returns: TikTok business accounts for barber shops
# with usernames, engagement indicators, and business detection
```

### **Example 2: Find Restaurant Listings on Yelp**
```python
# User asks: "Find restaurants on Yelp"
result = await web_search_tool.execute(
    query="restaurant yelp",
    result_type="social_media",
    max_results=3
)

# Returns: Yelp business listings for restaurants
# with contact info, hours, reviews, and booking capabilities
```

### **Example 3: Cross-Platform Business Discovery**
```python
# User asks: "Find coffee shops"
result = await web_search_tool.execute(
    query="coffee shop",
    result_type="social_media",
    max_results=10
)

# Returns: Coffee shops across all platforms
# - Social media accounts (TikTok, Instagram, Facebook, etc.)
# - Business directory listings (Yelp, Google Business, etc.)
# - Complete business intelligence
```

## Best Practices for AI Agents

### **1. Always Use result_type="social_media" for Business Discovery**
```python
# ✅ Correct
result = await web_search_tool.execute(
    query="barber shop tiktok",
    result_type="social_media"
)

# ❌ Incorrect - won't find business accounts
result = await web_search_tool.execute(
    query="barber shop tiktok",
    result_type="web"
)
```

### **2. Use Specific Platform Queries When Possible**
```python
# ✅ Better - more targeted results
result = await web_search_tool.execute(
    query="restaurant instagram",
    result_type="social_media"
)

# ✅ Also good - cross-platform discovery
result = await web_search_tool.execute(
    query="restaurant",
    result_type="social_media"
)
```

### **3. Handle Different Result Types**
```python
result = await web_search_tool.execute(
    query="coffee shop",
    result_type="social_media"
)

for item in result.get('result', []):
    if item.get('type') == 'social_media':
        # Handle social media business account
        platform = item.get('platform')
        username = item.get('username')
        is_business = item.get('is_business_account')
        
    elif item.get('type') == 'business_directory':
        # Handle business directory listing
        platform = item.get('platform')
        business_info = item.get('business_info', {})
        has_contact = business_info.get('has_phone')
        has_reviews = business_info.get('has_reviews')
```

## Common Use Cases

### **1. Competitor Research**
```python
# Find competitors on social media
result = await web_search_tool.execute(
    query="competitor_name tiktok",
    result_type="social_media"
)
```

### **2. Lead Generation**
```python
# Find potential customers
result = await web_search_tool.execute(
    query="target_audience instagram",
    result_type="social_media"
)
```

### **3. Market Research**
```python
# Research industry presence
result = await web_search_tool.execute(
    query="industry_name",
    result_type="social_media"
)
```

### **4. Business Intelligence**
```python
# Gather business information
result = await web_search_tool.execute(
    query="business_name yelp",
    result_type="social_media"
)
```

## Error Handling

```python
try:
    result = await web_search_tool.execute(
        query="barber shop tiktok",
        result_type="social_media"
    )
    
    if result.get('success'):
        # Process results
        businesses = result.get('result', [])
        for business in businesses:
            # Handle each business result
            pass
    else:
        # Handle error
        error_message = result.get('error', 'Unknown error')
        
except Exception as e:
    # Handle exception
    print(f"Search failed: {str(e)}")
```

## Performance Tips

1. **Use specific queries** for better results
2. **Limit max_results** appropriately (5-10 for business discovery)
3. **Handle both result types** (social_media and business_directory)
4. **Extract business intelligence** from the results
5. **Present results clearly** to users

## Summary

The enhanced Web Search tool now provides comprehensive business discovery capabilities across social media platforms and business directories. AI agents should:

1. Use `result_type="social_media"` for business discovery
2. Format queries as `"business_type platform"`
3. Handle both social media and business directory results
4. Extract and present business intelligence to users
5. Use cross-platform discovery for comprehensive results

This makes the tool incredibly powerful for business research, lead generation, competitor analysis, and market intelligence.
