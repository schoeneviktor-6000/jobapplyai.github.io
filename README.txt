JOBMEJOB BRAND ASSETS (v2)

Files included
- favicon.ico
- favicon-16x16.png
- favicon-32x32.png
- favicon-192x192.png
- favicon-512x512.png
- apple-touch-icon.png
- site.webmanifest
- logo-512.png          (use for Google "logo" structured data)
- logo-mark.svg         (use in your navbar / app header)

Where to put these files
- If your project has a /public folder: put everything into /public
- Otherwise: put everything next to your index.html (web root)

HTML <head> snippet (paste inside <head>)
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32">
<link rel="icon" type="image/png" href="/favicon-16x16.png" sizes="16x16">
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0b1220">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "jobmejob",
  "url": "https://jobmejob.com/",
  "logo": "https://jobmejob.com/logo-512.png"
}
</script>

Navbar logo replacement (optional)
Replace:
  <div class="logo" aria-hidden="true"></div>
With:
  <img class="brandLogo" src="/logo-mark.svg" alt="jobmejob" width="34" height="34">

Add CSS for .brandLogo if you want:
.brandLogo{width:34px;height:34px;display:block}
