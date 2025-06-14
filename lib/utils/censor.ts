const explicitWords = [
  'explicit',
  'offensive',
  'damn',
  'hell',
  'crap',
  'stupid',
  'idiot',
  'dumb',
  'hate',
  'terrible',
  'awful',
  'horrible',
  'garbage',
  'trash',
  'worthless',
  'rubbish',
  'junk',
  'pathetic',
  'useless',
  'waste'
];

export function censorText(text: string): string {
  let censoredText = text.toLowerCase();
  explicitWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    censoredText = censoredText.replace(regex, '*'.repeat(word.length));
  });
  return censoredText;
}

export function containsExplicitContent(text: string): boolean {
  return explicitWords.some(word => 
    text.toLowerCase().includes(word.toLowerCase())
  );
}