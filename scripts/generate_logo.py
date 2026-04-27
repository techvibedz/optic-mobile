import xml.etree.ElementTree as ET
import os

svg_path = r"c:\optic\optimal-manager\mobile\assets\logo.svg"
output_path = r"c:\optic\optimal-manager\mobile\src\components\Logo.js"

# Create directory if not exists
os.makedirs(os.path.dirname(output_path), exist_ok=True)

tree = ET.parse(svg_path)
root = tree.getroot()

# Namespace handling (SVG usually has one)
ns = {'svg': 'http://www.w3.org/2000/svg'}

paths = []
# Find all paths
# Since the namespace might be tricky or absent in some tags, we'll iterate all elements
for elem in root.iter():
    if elem.tag.endswith('path'):
        d = elem.attrib.get('d')
        stroke = elem.attrib.get('stroke')
        fill = elem.attrib.get('fill')
        
        # Skip the white background path
        if fill == '#ffffff':
            continue
            
        props = f'd="{d}"'
        if stroke:
            props += f' stroke="{stroke}"'
        if fill and fill != 'none':
            props += f' fill="{fill}"'
        
        # Add strokeWidth if present in parent group (it was 2.00)
        # But here we'll just let it inherit or set it on the path if needed.
        # The SVG had stroke-width="2.00" on the group.
        # We should add strokeWidth="2" to the paths or the Svg component.
        
        # Also clean up vector-effect if present (not supported in RN SVG usually, or ignore)
        
        paths.append(f'<Path {props} vectorEffect="non-scaling-stroke" />')

# Generate Component
content = """import React from 'react';
import { Svg, Path, G } from 'react-native-svg';
import { useTheme } from 'react-native-paper';

const Logo = ({ width = 200, height = 200, style }) => {
  const theme = useTheme();
  
  return (
    <Svg width={width} height={height} viewBox="0 0 1773 1773" style={style}>
      <G strokeWidth="2" fill="none" strokeLinecap="butt">
"""

for p in paths:
    content += f"        {p}\n"

content += """      </G>
    </Svg>
  );
};

export default Logo;
"""

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Generated {output_path} with {len(paths)} paths.")
