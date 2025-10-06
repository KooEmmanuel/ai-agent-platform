# Business Directory Search

Enhanced web search tool with comprehensive business directory search capabilities across multiple platforms.

## Overview

The web search tool now includes powerful business directory search functionality that allows you to find business listings across multiple platforms including Yelp, Google Business, Vagaro, Yellow Pages, and other business listing platforms.

## Supported Business Directories

### 🏢 **Primary Business Directories**
- **Yelp** - Restaurant and business reviews
- **Google Business** - Google Maps business listings
- **Vagaro** - Beauty and wellness booking platform
- **Yellow Pages** - Traditional business directory
- **SuperPages** - Online business directory

### 🎯 **Specialized Platforms**
- **SuperPages** - Local business directory
- **WhitePages** - Business and residential listings
- **Manta** - B2B business directory
- **Local.com** - Local business search
- **CitySearch** - City-specific business listings
- **Foursquare** - Location-based business discovery
- **TripAdvisor** - Travel and hospitality businesses
- **Zomato** - Restaurant and food service
- **OpenTable** - Restaurant reservations
- **Resy** - Restaurant booking platform
- **Booker** - Appointment booking platform
- **MindBody** - Wellness and fitness booking
- **Acuity** - Appointment scheduling
- **Square** - Business management platform

## Features

### 🔍 **Comprehensive Business Search**
- **Multi-platform search** across all major business directories
- **Business information extraction** from listings
- **Contact information detection** (phone, email, address)
- **Operating hours detection** and business status
- **Review and rating indicators**
- **Booking and appointment capabilities**

### 📊 **Business Intelligence**
- **Location data** extraction (address, directions)
- **Service information** (menu, pricing, services)
- **Contact methods** (phone, website, email)
- **Business hours** and availability
- **Photo and media** indicators
- **Review and rating** presence

### 🎯 **Smart Detection**
- **Platform identification** from URLs and content
- **Business type classification** from descriptions
- **Service availability** detection
- **Contact method** identification
- **Booking capability** detection

## Usage Examples

### Basic Business Directory Search

```python
# Search for barber shops on Yelp
result = await web_search_tool.execute(
    query="barber shop yelp",
    result_type="social_media",  # Includes business directories
    max_results=5
)

# Search for restaurants on Google Business
result = await web_search_tool.execute(
    query="restaurant google business",
    result_type="social_media",
    max_results=3
)
```

### Platform-Specific Queries

```python
# Find salons on Vagaro
result = await web_search_tool.execute(
    query="salon vagaro",
    result_type="social_media"
)

# Discover gyms on Yellow Pages
result = await web_search_tool.execute(
    query="gym yellow pages",
    result_type="social_media"
)
```

### Cross-Platform Discovery

```python
# Find coffee shops across all business directories
result = await web_search_tool.execute(
    query="coffee shop local business",
    result_type="social_media"
)
```

## Query Examples

### 🎯 **Effective Queries**
- `"barber shop yelp"` - Find barber shops on Yelp
- `"restaurant google business"` - Discover restaurants on Google Business
- `"salon vagaro"` - Locate salons on Vagaro
- `"gym yellow pages"` - Find gyms on Yellow Pages
- `"coffee shop local business"` - Search across all directories

### 🔧 **Query Format**
- **Business Type + Platform**: `"business_type platform"`
- **Platform + Business Type**: `"platform business_type"`
- **Business Type + Local**: `"business_type local business"`

## Result Format

Each business directory search result includes:

```json
{
  "title": "Business Name",
  "url": "https://platform.com/business",
  "snippet": "Business description and details",
  "type": "business_directory",
  "platform": "yelp|google_business|vagaro|yellow_pages|etc",
  "business_type": "extracted business type",
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
  },
  "has_reviews": true,
  "has_contact": true,
  "has_location": true,
  "has_hours": true
}
```

## Supported Platforms

### 🍽️ **Food & Hospitality**
- **Yelp** - Restaurant reviews and ratings
- **Zomato** - Food delivery and restaurant discovery
- **OpenTable** - Restaurant reservations
- **Resy** - Restaurant booking platform
- **TripAdvisor** - Travel and hospitality reviews

### 💄 **Beauty & Wellness**
- **Vagaro** - Beauty and wellness booking
- **Booker** - Appointment booking platform
- **MindBody** - Wellness and fitness
- **Acuity** - Appointment scheduling platform

### 🏢 **General Business**
- **Google Business** - Google Maps business listings
- **Yellow Pages** - Traditional business directory
- **SuperPages** - Online business directory
- **WhitePages** - Business and residential listings
- **Manta** - B2B business directory
- **Local.com** - Local business search
- **CitySearch** - City-specific business listings
- **Foursquare** - Location-based discovery

### 💼 **Business Services**
- **Square** - Business management platform
- **Booker** - Appointment booking
- **Acuity** - Scheduling platform
- **MindBody** - Wellness business management

## Business Information Extraction

The tool automatically extracts:

### 📞 **Contact Information**
- Phone numbers and contact details
- Email addresses and websites
- Physical addresses and locations
- Social media links

### 🕒 **Business Operations**
- Operating hours and availability
- Service descriptions and offerings
- Pricing information and menus
- Booking and appointment capabilities

### 📊 **Business Intelligence**
- Review and rating indicators
- Photo and media presence
- Service categories and specialties
- Location and accessibility information

## Advanced Features

### 🔍 **Smart Platform Detection**
- Automatically detects platform from URL
- Identifies business directory type
- Supports multiple platform formats

### 📈 **Business Intelligence**
- Identifies business capabilities
- Detects service offerings
- Extracts contact methods
- Analyzes business information

### 🎯 **Business Type Classification**
- Automatically extracts business type from queries
- Removes platform keywords
- Cleans up common words

## Integration Examples

### 🤖 **AI Agent Integration**
```python
# AI agent can now search for business listings
agent_response = await agent.execute(
    "Find me barber shops on Yelp in my area"
)
```

### 🔍 **Research Use Cases**
- Competitor analysis across platforms
- Market research and business intelligence
- Lead generation and prospecting
- Business directory monitoring

### 📊 **Business Intelligence**
- Industry analysis across platforms
- Service availability research
- Contact information gathering
- Business capability assessment

## Performance Tips

1. **Use specific queries**: `"barber shop yelp"` vs `"barber"`
2. **Platform-specific**: Specify platform for better results
3. **Business keywords**: Include business-related terms
4. **Local context**: Add location for better results

## Limitations

- **Public listings only**: Cannot access private business data
- **Rate limiting**: Subject to search engine rate limits
- **Platform changes**: URLs and formats may change
- **Content availability**: Depends on search engine indexing

## Future Enhancements

- **API Integration**: Direct platform API access
- **Real-time data**: Live business information
- **Geographic filtering**: Location-based search
- **Industry categorization**: Automatic business categorization
- **Review analysis**: Sentiment analysis of reviews
- **Competitor analysis**: Cross-platform business comparison

## Support

For issues or questions about the business directory search functionality:

1. Check the query format and examples
2. Verify platform names are correct
3. Try different business type keywords
4. Use more specific queries for better results

---

**Note**: This feature enhances the existing web search tool and maintains all original functionality while adding powerful business directory discovery capabilities across multiple platforms.
