const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

schema = schema.replace(
  /model StaticPage \{([\s\S]*?)\}/,
  `model StaticPage {$1  metaTitle       String?\n  metaDescription String?\n}`
);

schema = schema.replace(
  /model Banner \{([\s\S]*?)\}/,
  `model Banner {$1  subtitle  String?\n  ctaText   String?\n  ctaLink   String?\n  startDate DateTime?\n  endDate   DateTime?\n}`
);

fs.writeFileSync('prisma/schema.prisma', schema);
console.log("Schema updated");
