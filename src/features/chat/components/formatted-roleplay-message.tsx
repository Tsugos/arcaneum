import React from 'react';

interface FormattedRoleplayMessageProps {
  content: string;
}

export const FormattedRoleplayMessage: React.FC<FormattedRoleplayMessageProps> = ({ content }) => {
  if (!content) return null;

  // Regex matches quotes (".*?", «.*?», “...”), bold (**...**), and actions (*...*)
  const regex = /(\*\*.*?\*\*|\*.*?\*|".*?"|«.*?»|“.*?”)/gs;
  const parts = content.split(regex);

  return (
    <div className="whitespace-pre-wrap leading-relaxed select-text">
      {parts.map((part, index) => {
        if (!part) return null;

        // Dialogue in quotes -> Dark Yellow / Amber text
        if (
          (part.startsWith('"') && part.endsWith('"')) ||
          (part.startsWith('«') && part.endsWith('»')) ||
          (part.startsWith('“') && part.endsWith('”'))
        ) {
          return (
            <span key={index} className="text-amber-300 font-medium drop-shadow-sm">
              {part}
            </span>
          );
        }

        // Bold text in double asterisks **text** -> Bold without asterisks
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return (
            <span key={index} className="font-bold text-slate-100">
              {boldText}
            </span>
          );
        }

        // Action text in asterisks *text* -> Italics WITHOUT rendering asterisks (User Note 346)
        if (part.startsWith('*') && part.endsWith('*')) {
          const actionText = part.slice(1, -1);
          return (
            <span key={index} className="italic text-slate-300 opacity-90">
              {actionText}
            </span>
          );
        }

        // Normal text
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
};
