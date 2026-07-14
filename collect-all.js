// collect-all.js
const fs = require('fs');
const path = require('path');

// إعدادات
const OUTPUT_FILE = 'project-full-code.txt';
const EXCLUDE_DIRS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'coverage',
  '.vercel',
  'out',
  '.turbo',
  '.cache'
];
const EXCLUDE_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'collect-all.js',
  'project-full-code.txt'
];
const ALLOWED_EXTENSIONS = [
  '.tsx', '.ts', '.jsx', '.js',
  '.css', '.scss', '.module.css',
  '.json', '.html',
  '.md', '.mdx',
  '.sql'
];

// إحصائيات
let stats = {
  totalFiles: 0,
  totalSize: 0,
  filesByType: {},
  errors: []
};

function shouldInclude(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);
  
  // استبعاد الملفات
  if (EXCLUDE_FILES.includes(fileName)) return false;
  
  // استبعاد المجلدات
  for (const dir of EXCLUDE_DIRS) {
    if (filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`)) {
      return false;
    }
    if (filePath === dir || filePath === `./${dir}`) return false;
  }
  
  // التأكد من الامتداد
  return ALLOWED_EXTENSIONS.includes(ext);
}

function readDirectory(dir, basePath = '') {
  let result = '';
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativePath = path.join(basePath, item);
      
      try {
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          result += readDirectory(fullPath, relativePath);
        } else if (shouldInclude(fullPath)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const ext = path.extname(fullPath);
            const size = content.length;
            
            // تحديث الإحصائيات
            stats.totalFiles++;
            stats.totalSize += size;
            stats.filesByType[ext] = (stats.filesByType[ext] || 0) + 1;
            
            // إضافة الملف للمخرجات
            result += '\n' + '='.repeat(100) + '\n';
            result += `📁 FILE: ${relativePath}\n`;
            result += `📊 Size: ${(size / 1024).toFixed(2)} KB | Type: ${ext || 'no extension'}\n`;
            result += '='.repeat(100) + '\n\n';
            result += content + '\n\n';
            
          } catch (error) {
            stats.errors.push(`❌ Error reading ${relativePath}: ${error.message}`);
          }
        }
      } catch (error) {
        stats.errors.push(`❌ Error accessing ${relativePath}: ${error.message}`);
      }
    }
  } catch (error) {
    stats.errors.push(`❌ Error reading directory ${dir}: ${error.message}`);
  }
  
  return result;
}

// بدء الجمع
console.log('🚀 Starting code collection...');
console.log('📂 Scanning project directory...\n');

const startTime = Date.now();
const output = readDirectory(process.cwd());
const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

// إضافة التقرير في البداية
const header = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    📊 PROJECT CODE ANALYSIS REPORT                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

📅 Generated: ${new Date().toLocaleString('ar-EG')}
⏱️  Time taken: ${elapsed} seconds

📁 Project: ${path.basename(process.cwd())}
📂 Path: ${process.cwd()}

📊 Statistics:
   • Total files: ${stats.totalFiles}
   • Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB
   • File types:

${Object.entries(stats.filesByType)
  .sort((a, b) => b[1] - a[1])
  .map(([ext, count]) => `     ${ext || 'no extension'}: ${count} files`)
  .join('\n')}

${stats.errors.length > 0 ? `
⚠️  Errors encountered:
${stats.errors.map(e => `   • ${e}`).join('\n')}
` : '✅ No errors encountered'}

${'='.repeat(100)}

📄 START OF CODE DUMP
${'='.repeat(100)}

`;

// حفظ الملف
const finalOutput = header + output;
fs.writeFileSync(OUTPUT_FILE, finalOutput, 'utf8');

console.log(`\n✅ Done! Output saved to: ${OUTPUT_FILE}`);
console.log(`📊 Total files: ${stats.totalFiles}`);
console.log(`📦 Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`⏱️  Time: ${elapsed} seconds`);

if (stats.errors.length > 0) {
  console.log(`\n⚠️  ${stats.errors.length} errors occurred (see file for details)`);
}

console.log('\n📋 Next steps:');
console.log('1. Open the file in any text editor');
console.log('2. Copy the entire content');
console.log('3. Send it to me for analysis\n');
