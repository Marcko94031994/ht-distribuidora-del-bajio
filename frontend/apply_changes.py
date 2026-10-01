import re

with open('src/components/Reportes.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the conditional around the header
content = re.sub(r'\{\!focusedCard && \(\n\s*(<div className="card glass" style=\{\{\s*gridColumn:\s*\'1 / -1\',\s*padding:\s*\'16px 24px\')', r'\1', content)
content = re.sub(r'(</select>\s*</div>\s*</div>)\s*\)\}\s*\{\!focusedCard && \(\s*(<div className="kpi-row")', r'\1\n\n      {!focusedCard && (\n      \2', content)

# 2. Change the masonry wrapper
content = content.replace('<div style={{ gridColumn: \'1 / -1\', columnWidth: focusedCard ? \'100%\' : \'450px\', columnGap: \'20px\' }}>', 
                          '<div style={ focusedCard ? { gridColumn: \'1 / -1\', display: \'block\' } : { gridColumn: \'1 / -1\', columnWidth: \'450px\', columnGap: \'20px\' } }>')

with open('src/components/Reportes.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
