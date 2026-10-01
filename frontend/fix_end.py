
with open('src/components/Reportes.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('''          </div>
        </div>
      )}
      </div>

    </div>
  );
}''', '''          </div>
        </div>
      </div>
      )}
      </div>

    </div>
  );
}''')

with open('src/components/Reportes.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

