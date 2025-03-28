#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Define the paths
const srcDir = path.join(__dirname, '..', 'src', 'coconiko');
const yamlPath = path.join(srcDir, 'coconiko_swagger.yaml');
const distDir = path.join(__dirname, '..', 'src');
const jsonPath = path.join(distDir, 'coconiko_swagger.json');

try {
  // Read the YAML file
  const yamlContent = fs.readFileSync(yamlPath, 'utf8');
  
  // Convert YAML to JSON
  const jsonContent = yaml.load(yamlContent);
  
  // Write the JSON to a file
  fs.writeFileSync(jsonPath, JSON.stringify(jsonContent, null, 2));
  
  console.log(`Successfully converted ${yamlPath} to ${jsonPath}`);
} catch (e) {
  console.error('Error converting Swagger YAML to JSON:', e);
  process.exit(1);
} 