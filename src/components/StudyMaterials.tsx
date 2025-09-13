import React from 'react';

const materials = [
  { name: 'Programa Ynova + Jul2025.pdf', href: '#' },
  { name: 'Bem vindo a Ynova Marketplace de Energia.pdf', href: '#' },
];

export default function StudyMaterials() {
  return (
    <div className="bg-white dark:bg-[#3E3E3E] shadow-md rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-2">Material didático</h2>
      <ul className="space-y-2">
        {materials.map((m) => (
          <li key={m.name}>
            <a href={m.href} className="flex items-center text-yn-orange hover:underline">
              <span className="mr-2">📄</span>
              {m.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

