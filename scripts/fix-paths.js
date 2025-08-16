const fs = require('fs');
const path = require('path');

const basePath = '/shift-time';

// Function to fix paths in HTML files
function fixPathsInHtml(htmlContent) {
  return htmlContent
    .replace(/href="\/manifest\.json"/g, `href="${basePath}/manifest.json"`)
    .replace(/href="\/favicon\.ico"/g, `href="${basePath}/favicon.ico"`)
    .replace(/href="\/apple-touch-icon\.png"/g, `href="${basePath}/apple-touch-icon.png"`)
    .replace(/href="\/android-chrome-192x192\.png"/g, `href="${basePath}/android-chrome-192x192.png"`)
    .replace(/href="\/android-chrome-512x512\.png"/g, `href="${basePath}/android-chrome-512x512.png"`)
    .replace(/href="\/favicon-16x16\.png"/g, `href="${basePath}/favicon-16x16.png"`)
    .replace(/href="\/favicon-32x32\.png"/g, `href="${basePath}/favicon-32x32.png"`)
    .replace(/href="\/site\.webmanifest"/g, `href="${basePath}/site.webmanifest"`);
}

// Function to process all HTML files in the out directory
function processHtmlFiles() {
  const outDir = path.join(__dirname, '..', 'out');
  
  if (!fs.existsSync(outDir)) {
    console.log('❌ out directory not found. Run npm run build first.');
    return;
  }

  const htmlFiles = [];
  
  // Find all HTML files recursively
  function findHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        findHtmlFiles(filePath);
      } else if (file.endsWith('.html')) {
        htmlFiles.push(filePath);
      }
    });
  }
  
  findHtmlFiles(outDir);
  
  if (htmlFiles.length === 0) {
    console.log('❌ No HTML files found in out directory.');
    return;
  }
  
  console.log(`🔧 Found ${htmlFiles.length} HTML files to process...`);
  
  let processedCount = 0;
  
  htmlFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fixedContent = fixPathsInHtml(content);
      
      if (content !== fixedContent) {
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        processedCount++;
        console.log(`✅ Fixed paths in: ${path.relative(outDir, filePath)}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  });
  
  console.log(`\n🎉 Successfully processed ${processedCount} HTML files!`);
  console.log(`📁 All asset paths now use ${basePath} prefix.`);
}

// Run the script
if (require.main === module) {
  processHtmlFiles();
}

module.exports = { fixPathsInHtml, processHtmlFiles };
