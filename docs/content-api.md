Content API
Ghost’s RESTful Content API delivers published content to the world and can be accessed in a read-only manner by any
client to render in a website, app, or other embedded media.

Access control is managed via an API key, and even the most complex filters are made simple with our SDK. The Content
API is designed to be fully cachable, meaning you can fetch data as often as you like without limitation.

API Clients
JavaScript Client Library
We’ve developed an API client for JavaScript that will allow you to quickly and easily interact with the Content API.
The client is an advanced wrapper on top of our REST API - everything that can be done with the Content API can be done
using the client, with no need to deal with the details of authentication or the request & response format.

URL
https://{admin_domain}/ghost/api/content/

Your admin domain can be different to your site domain. Using the correct domain and protocol are critical to getting
consistent behaviour, particularly when dealing with CORS in the browser. All Ghost(Pro) blogs have a *.ghost.io domain
as their admin domain and require https.

Key
?key={key}

Content API keys are provided via a query parameter in the URL. These keys are safe for use in browsers and other
insecure environments, as they only ever provide access to public data. Sites in private mode should consider where they
share any keys they create.

Obtain the Content API URL and key by creating a new Custom Integration under the Integrations screen in Ghost Admin.

Get a Ghost Content API key
Accept-Version Header
Accept-Version: v{major}.{minor}

Use the Accept-Version header to indicate the minimum version of Ghost’s API to operate with. See API Versioning for
more details.

Working Example

# cURL

# Real endpoint - copy and paste to see!

curl -H "Accept-Version: v5.0" "https://demo.ghost.io/ghost/api/content/posts/?key=22444f78447824223cefc48062"
Endpoints
The Content API provides access to Posts, Pages, Tags, Authors, Tiers, and Settings. All endpoints return JSON and are
considered stable.

Working Example
Verb Path Method
GET /posts/ Browse posts
GET /posts/{id}/ Read a post by ID
GET /posts/slug/{slug}/ Read a post by slug
GET /authors/ Browse authors
GET /authors/{id}/ Read an author by ID
GET /authors/slug/{slug}/ Read a author by slug
GET /tags/ Browse tags
GET /tags/{id}/ Read a tag by ID
GET /tags/slug/{slug}/ Read a tag by slug
GET /pages/ Browse pages
GET /pages/{id}/ Read a page by ID
GET /pages/slug/{slug}/ Read a page by slug
GET /tiers/
Browse tiers
GET /settings/ Browse settings
The Content API supports two types of request: Browse and Read. Browse endpoints allow you to fetch lists of resources,
whereas Read endpoints allow you to fetch a single resource.

Resources
The API will always return valid JSON in the same structure:

{
"resource_type": [{
...
}],
"meta": {}
}
resource_type: will always match the resource name in the URL. All resources are returned wrapped in an array, with the
exception of /site/ and /settings/.
meta: contains pagination information for browse requests.
Posts
Posts are the primary resource in a Ghost site. Using the posts endpoint it is possible to get lists of posts filtered
by various criteria.

GET /content/posts/
GET /content/posts/{id}/
GET /content/posts/slug/{slug}/
By default, posts are returned in reverse chronological order by published date when fetching more than one.

The most common gotcha when fetching posts from the Content API is not using the include parameter to request related
data such as tags and authors. By default, the response for a post will not include these:

{
"posts": [
{
"slug": "welcome-short",
"id": "5ddc9141c35e7700383b2937",
"uuid": "a5aa9bd8-ea31-415c-b452-3040dae1e730",
"title": "Welcome",
"html": "<p>👋 Welcome, it's great to have you here.</p>",
"comment_id": "5ddc9141c35e7700383b2937",
"feature_image": "https://static.ghost.org/v3.0.0/images/welcome-to-ghost.png",
"feature_image_alt": null,
"feature_image_caption": null,
"featured": false,
"visibility": "public",
"created_at": "2019-11-26T02:43:13.000+00:00",
"updated_at": "2019-11-26T02:44:17.000+00:00",
"published_at": "2019-11-26T02:44:17.000+00:00",
"custom_excerpt": null,
"codeinjection_head": null,
"codeinjection_foot": null,
"custom_template": null,
"canonical_url": null,
"url": "https://docs.ghost.io/welcome-short/",
"excerpt": "👋 Welcome, it's great to have you here.",
"reading_time": 0,
"access": true,
"og_image": null,
"og_title": null,
"og_description": null,
"twitter_image": null,
"twitter_title": null,
"twitter_description": null,
"meta_title": null,
"meta_description": null,
"email_subject": null
}
]
}
Posts allow you to include authors and tags using &include=authors,tags, which will add an authors and tags array to the
response, as well as both a primary_author and primary_tag object.

Working Example

# cURL

# Real endpoint - copy and paste to see!

curl "https://demo.ghost.io/ghost/api/content/posts/?key=22444f78447824223cefc48062&include=tags,authors"
Returns:

{
"posts": [
{
"slug": "welcome-short",
"id": "5c7ece47da174000c0c5c6d7",
"uuid": "3a033ce7-9e2d-4b3b-a9ef-76887efacc7f",
"title": "Welcome",
"html": "<p>👋 Welcome, it's great to have you here.</p>",
"comment_id": "5c7ece47da174000c0c5c6d7",
"feature_image": "https://casper.ghost.org/v2.0.0/images/welcome-to-ghost.jpg",
"feature_image_alt": null,
"feature_image_caption": null,
"featured": false,
"meta_title": null,
"meta_description": null,
"created_at": "2019-03-05T19:30:15.000+00:00",
"updated_at": "2019-03-26T19:45:31.000+00:00",
"published_at": "2012-11-27T15:30:00.000+00:00",
"custom_excerpt": "Welcome, it's great to have you here.",
"codeinjection_head": null,
"codeinjection_foot": null,
"og_image": null,
"og_title": null,
"og_description": null,
"twitter_image": null,
"twitter_title": null,
"twitter_description": null,
"custom_template": null,
"canonical_url": null,
"authors": [
{
"id": "5951f5fca366002ebd5dbef7",
"name": "Ghost",
"slug": "ghost",
"profile_image": "https://demo.ghost.io/content/images/2017/07/ghost-icon.png",
"cover_image": null,
"bio": "The professional publishing platform",
"website": "https://ghost.org",
"location": null,
"facebook": "ghost",
"twitter": "@tryghost",
"meta_title": null,
"meta_description": null,
"url": "https://demo.ghost.io/author/ghost/"
}
],
"tags": [
{
"id": "59799bbd6ebb2f00243a33db",
"name": "Getting Started",
"slug": "getting-started",
"description": null,
"feature_image": null,
"visibility": "public",
"meta_title": null,
"meta_description": null,
"url": "https://demo.ghost.io/tag/getting-started/"
}
],
"primary_author": {
"id": "5951f5fca366002ebd5dbef7",
"name": "Ghost",
"slug": "ghost",
"profile_image": "https://demo.ghost.io/content/images/2017/07/ghost-icon.png",
"cover_image": null,
"bio": "The professional publishing platform",
"website": "https://ghost.org",
"location": null,
"facebook": "ghost",
"twitter": "@tryghost",
"meta_title": null,
"meta_description": null,
"url": "https://demo.ghost.io/author/ghost/"
},
"primary_tag": {
"id": "59799bbd6ebb2f00243a33db",
"name": "Getting Started",
"slug": "getting-started",
"description": null,
"feature_image": null,
"visibility": "public",
"meta_title": null,
"meta_description": null,
"url": "https://demo.ghost.io/tag/getting-started/"
},
"url": "https://demo.ghost.io/welcome-short/",
"excerpt": "Welcome, it's great to have you here."
}
]
}
Pages
Pages are static resources that are not included in channels or collections on the Ghost front-end. The API will only
return pages that were created as resources and will not contain routes created with dynamic routing.

GET /content/pages/
GET /content/pages/{id}/
GET /content/pages/slug/{slug}/
Pages are structured identically to posts. The response object will look the same, only the resource key will be pages.

By default, pages are ordered by title when fetching more than one.

Tags
Tags are the primary taxonomy within a Ghost site.

GET /content/tags/
GET /content/tags/{id}/
GET /content/tags/slug/{slug}/
By default, internal tags are always included, use filter=visibility:public to limit the response directly or use the
tags helper to handle filtering and outputting the response.

Tags that are not associated with a post are not returned. You can supply include=count.posts to retrieve the number of
posts associated with a tag.

{
"tags": [
{
"slug": "getting-started",
"id": "5ddc9063c35e7700383b27e0",
"name": "Getting Started",
"description": null,
"feature_image": null,
"visibility": "public",
"meta_title": null,
"meta_description": null,
"og_image": null,
"og_title": null,
"og_description": null,
"twitter_image": null,
"twitter_title": null,
"twitter_description": null,
"codeinjection_head": null,
"codeinjection_foot": null,
"canonical_url": null,
"accent_color": null,
"url": "https://docs.ghost.io/tag/getting-started/"
}
]
}
By default, tags are ordered by name when fetching more than one.

Authors
Authors are a subset of users who have published posts associated with them.

GET /content/authors/
GET /content/authors/{id}/
GET /content/authors/slug/{slug}/
Authors that are not associated with a post are not returned. You can supply include=count.posts to retrieve the number
of posts associated with an author.

{
"authors": [
{
"slug": "cameron",
"id": "5ddc9b9510d8970038255d02",
"name": "Cameron Almeida",
"profile_image": "https://docs.ghost.io/content/images/2019/03/1c2f492a-a5d0-4d2d-b350-cdcdebc7e413.jpg",
"cover_image": null,
"bio": "Editor at large.",
"website": "https://example.com",
"location": "Cape Town",
"facebook": "example",
"twitter": "@example",
"meta_title": null,
"meta_description": null,
"url": "https://docs.ghost.io/author/cameron/"
}
]
}
Settings
Settings contain the global settings for a site.

GET /content/settings/
The settings endpoint is a special case. You will receive a single object, rather than an array. This endpoint doesn’t
accept any query parameters.

{
"settings": {
"title": "Ghost",
"description": "The professional publishing platform",
"logo": "https://docs.ghost.io/content/images/2014/09/Ghost-Transparent-for-DARK-BG.png",
"icon": "https://docs.ghost.io/content/images/2017/07/favicon.png",
"accent_color": null,
"cover_image": "https://docs.ghost.io/content/images/2019/10/publication-cover.png",
"facebook": "ghost",
"twitter": "@tryghost",
"lang": "en",
"timezone": "Etc/UTC",
"codeinjection_head": null,
"codeinjection_foot": "<script src=\"//rum-static.pingdom.net/pa-5d8850cd3a70310008000482.js\" async></script>",
"navigation": [
{
"label": "Home",
"url": "/"
},
{
"label": "About",
"url": "/about/"
},
{
"label": "Getting Started",
"url": "/tag/getting-started/"
},
{
"label": "Try Ghost",
"url": "https://ghost.org"
}
],
"secondary_navigation": [],
"meta_title": null,
"meta_description": null,
"og_image": null,
"og_title": null,
"og_description": null,
"twitter_image": null,
"twitter_title": null,
"twitter_description": null,
"members_support_address": "noreply@docs.ghost.io",
"url": "https://docs.ghost.io/"
}
}
Tiers
Tiers allow publishers to create multiple options for an audience to become paid subscribers. Each tier can have its own
price points, benefits, and content access levels. Ghost connects tiers directly to the publication’s Stripe account.

Usage
The tiers endpoint returns a list of tiers for the site, filtered by their visibility criteria.

GET /content/tiers/
Tiers are returned in order of increasing monthly price.

{
"tiers": [
{
"id": "62307cc71b4376a976734037",
"name": "Free",
"description": null,
"slug": "free",
"active": true,
"type": "free",
"welcome_page_url": null,
"created_at": "2022-03-15T11:47:19.000Z",
"updated_at": "2022-03-15T11:47:19.000Z",
"stripe_prices": null,
"benefits": null,
"visibility": "public"
},
{
"id": "6230d7c8c62265c44f24a594",
"name": "Gold",
"description": null,
"slug": "gold",
"active": true,
"type": "paid",
"welcome_page_url": "/welcome-to-gold",
"created_at": "2022-03-15T18:15:36.000Z",
"updated_at": "2022-03-15T18:16:00.000Z",
"stripe_prices": null,
"benefits": null,
"visibility": "public"
}
]
}
Working example

# cURL

# Real endpoint - copy and paste to see!

curl "https://demo.ghost.io/ghost/api/content/tiers/?key=22444f78447824223cefc48062&include=benefits,monthly_price,yearly_price"
returns:

{
"tiers": [
{
"id": "61ee7f5c5a6309002e738c41",
"name": "Free",
"description": null,
"slug": "61ee7f5c5a6309002e738c41",
"active": true,
"type": "free",
"welcome_page_url": "/",
"created_at": "2022-01-24T10:28:44.000Z",
"updated_at": null,
"stripe_prices": null,
"monthly_price": null,
"yearly_price": null,
"benefits": [],
"visibility": "public"
},
{
"id": "60815dbe9af732002f9e02fa",
"name": "Ghost Subscription",
"description": null,
"slug": "ghost-subscription",
"active": true,
"type": "paid",
"welcome_page_url": "/",
"created_at": "2021-04-22T12:27:58.000Z",
"updated_at": "2022-01-12T17:22:29.000Z",
"stripe_prices": null,
"monthly_price": 500,
"yearly_price": 5000,
"currency": "usd",
"benefits": [],
"visibility": "public"
}
],
"meta": {
"pagination": {
"page": 1,
"limit": 15,
"pages": 1,
"total": 2,
"next": null,
"prev": null
}
}
}
Parameters
Query parameters provide fine-grained control over responses. All endpoints accept include and fields. Browse endpoints
additionally accept filter, limit, page and order.

The values provided as query parameters MUST be url encoded when used directly. The client libraries will handle this
for you.

Include
Tells the API to return additional data related to the resource you have requested. The following includes are
available:

Posts & Pages: authors, tags
Authors: count.posts
Tags: count.posts
Tiers: monthly_price, yearly_price, benefits
Includes can be combined with a comma, e.g., &include=authors,tags.

For posts and pages:

&include=authors will add "authors": [{...},] and "primary_author": {...}
&include=tags will add "tags": [{...},] and "primary_tag": {...}
For authors and tags:

&include=count.posts will add "count": {"posts": 7} to the response.
For tiers:

&include=monthly_price,yearly_price,benefits will add monthly price, yearly price, and benefits data.
Fields
Limit the fields returned in the response object. Useful for optimizing queries, but does not play well with include.

E.g. for posts &fields=title,url would return:

{
"posts": [
{
"id": "5b7ada404f87d200b5b1f9c8",
"title": "Welcome to Ghost",
"url": "https://demo.ghost.io/welcome/"
}
]
}
Formats
(Posts and Pages only)

By default, only html is returned, however each post and page in Ghost has 2 available formats: html and plaintext.

&formats=html,plaintext will additionally return the plaintext format.
Filter
(Browse requests only)

Apply fine-grained filters to target specific data.

&filter=featured:true on posts returns only those marked featured.
&filter=tag:getting-started on posts returns those with the tag slug that matches getting-started.
&filter=visibility:public on tiers returns only those marked as publicly visible.
The possibilities are extensive! Query strings are explained in detail in the filtering section.

Limit
(Browse requests only)

By default, only 15 records are returned at once.

&limit=5 would return only 5 records.
&limit=all will return all records - use carefully!
Page
(Browse requests only)

By default, the first 15 records are returned.

&page=2 will return the second set of 15 records.
Order
(Browse requests only)

Different resources have a different default sort order:

Posts: published_at DESC (newest post first)
Pages: title ASC (alphabetically by title)
Tags: name ASC (alphabetically by name)
Authors: name ASC (alphabetically by name)
Tiers: monthly_price ASC (from lowest to highest monthly price)
The syntax for modifying this follows SQL order by syntax:

&order=published_at%20asc would return posts with the newest post last
Filtering
Ghost uses a query language called NQL to allow filtering API results. You can filter any field or included field using
matches, greater/less than or negation, as well as combining with and/or. NQL doesn’t yet support ’like’ or partial
matches.

Filter strings must be URL encoded. The {{get}} helper and client library handle this for you.

At it’s most simple, filtering works the same as in GMail, GitHub or Slack - you provide a field and a value, separated
by a colon.

Syntax Reference
Filter Expressions
A filter expression is a string which provides the property, operator and value in the form property:operatorvalue:

property - a path representing the field to filter on
: - separator between property and an operator-value expression
operator (optional) - how to compare values (: on its own is roughly =)
value - the value to match against
Property
Matches: [a-zA-Z_][a-zA-Z0-9_.]

can contain only alpha-numeric characters and _
cannot contain whitespace
must start with a letter
supports . separated paths, E.g. authors.slug or posts.count
is always lowercase, but accepts and converts uppercase
Value
Can be one of the following

null
true
false
a number (integer)
a literal
Any character string which follows these rules:
Cannot start with - but may contain it
Cannot contain any of these symbols: '"+,()><=[] unless they are escaped
Cannot contain whitespace
a string
' string here ' Any character except a single or double quote surrounded by single quotes
Single or Double quote __MUST __be escaped*
Can contain whitespace
A string can contain a date any format that can be understood by new Date()
a relative date
Uses the pattern now-30d
Must start with now
Can use - or +
Any integer can be used for the size of the interval
Supports the following intervals: d, w, M, y, h, m, s
Operators

-
 - not

> - greater than
    >= - greater than or equals
    < - less than
    <= - less than or equals
    ~ - contains
    ~^ - starts with
    ~$ - ends with
    [ value, value, … ] - “in” group, can be negated with -
    Combinations

+
 - represents and
   , - represents or
   ( filter expression ) - overrides operator precedence
   Strings vs Literals
   Most of the time, there’s no need to put quotes around strings when building filters in Ghost. If you filter based on
   slugs, slugs are always compatible with literals. However, in some cases you may need to use a string that contains
   one of the other characters used in the filter syntax, e.g. dates & times contain:. Use single-quotes for these.

Pagination
All browse endpoints are paginated, returning 15 records by default. You can use the page and limit parameters to move
through the pages of records. The response object contains a meta.pagination key with information on the current
location within the records:

"meta":{
"pagination":{
"page":1,
"limit":2,
"pages":1,
"total":1,
"next":null,
"prev":null
}
}
Errors
The Content API will generate errors for the following cases:

Status 400: Badly formed queries e.g. filter parameters that are not correctly encoded
Status 401: Authentication failures e.g. unrecognized keys
Status 403: Permissions errors e.g. under-privileged users
Status 404: Unknown resources e.g. data which is not public
Status 500: Server errors e.g. where something has gone
Errors are also formatted in JSON, as an array of error objects. The HTTP status code of the response along with the
errorType property indicate the type of error.

The message field is designed to provide clarity on what exactly has gone wrong.

{
"errors": [
{
"message": "Unknown Content API Key",
"errorType": "UnauthorizedError"
}
]
}
Versioning
See API versioning for full details of the API versions and their stability levels.