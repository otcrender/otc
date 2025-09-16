# OTC Sports Center - Static Website

This is the static website for OTC Sports Center, a premier indoor tennis and pickleball facility in Oneonta, NY.

## Features

- **Responsive Design**: Mobile-first approach with Bootstrap 5
- **Modern UI**: Clean, professional design with smooth animations
- **SEO Optimized**: Meta tags, structured data, and semantic HTML
- **Contact Forms**: Interactive contact and reservation forms
- **Lessons Page**: Dedicated page for instructor information and lesson booking

## Project Structure

```
otc-deploy/
├── index.html             # Homepage
├── schedule.html          # Schedule page
├── lessons.html           # Lessons page
├── passes.html            # Passes page
├── reservations.html      # Reservations page
├── contact.html           # Contact page
├── css/                   # Stylesheets
│   ├── main.css          # Main styles
│   └── schedule.css      # Schedule-specific styles
├── js/                    # JavaScript files
│   └── main.js           # Main JavaScript (static version)
└── README.md              # This file
```

## Pages

- **Homepage**: Welcome page with facility overview
- **Schedule**: Court schedule display (coming soon)
- **Lessons**: Instructor profiles and lesson information
- **Passes**: Membership and pass options
- **Reservations**: Court reservation form
- **Contact**: Contact information and form

## Deployment

### Static Hosting
1. **Upload**: All files in this directory
2. **Configuration**: No server-side configuration needed
3. **Domain**: Can be hosted on any static hosting service

### Recommended Hosting Services
- **GitHub Pages**: Free static hosting
- **Netlify**: Free tier with custom domains
- **Vercel**: Free tier with excellent performance
- **AWS S3 + CloudFront**: Scalable static hosting

## Development

### Local Development
1. **Serve**: Use any static file server
2. **Examples**:
   - Python: `python -m http.server 8000`
   - Node.js: `npx serve .`
   - Live Server: VS Code extension

### File Structure
- **HTML**: Semantic markup with Bootstrap components
- **CSS**: Custom styles with Bootstrap overrides
- **JavaScript**: Vanilla JS with no external dependencies

## Customization

### Styling
- **Colors**: Update CSS custom properties in `main.css`
- **Layout**: Modify Bootstrap classes in HTML files
- **Animations**: Adjust JavaScript animations in `main.js`

### Content
- **Text**: Update content directly in HTML files
- **Images**: Replace images in appropriate directories
- **Contact Info**: Update contact details in all pages

## Features

### Interactive Elements
- **Mobile Menu**: Responsive navigation
- **Smooth Scrolling**: Animated scroll to sections
- **Form Validation**: Client-side form validation
- **Loading States**: Visual feedback for user actions

### Performance
- **Optimized Images**: Compressed and properly sized
- **Minified CSS**: Bootstrap CDN for fast loading
- **Efficient JavaScript**: Minimal, focused code
- **Fast Loading**: No external API dependencies

## Maintenance

### Updates
1. **Content**: Edit HTML files directly
2. **Styling**: Modify CSS files
3. **Functionality**: Update JavaScript as needed
4. **Deploy**: Upload changes to hosting service

### Testing
- **Responsive**: Test on mobile and desktop
- **Forms**: Test contact and reservation forms
- **Performance**: Check loading times
- **Cross-browser**: Test in different browsers

## Support

For questions about the website or hosting, contact the development team.