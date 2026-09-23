const fs = require('fs');

let content = fs.readFileSync('NewClientModal.tsx', 'utf-8');

// Replace left column containers
content = content.replace(/grid grid-cols-\[110px_1fr\] items-center gap-1\.5/g, 'flex flex-col gap-1');

// Replace right column containers
content = content.replace(/grid grid-cols-\[130px_1fr\] items-center gap-1\.5/g, 'flex flex-col gap-1');

// Replace label classes
content = content.replace(/label className="text-xs font-semibold text-slate-600 text-right"/g, 'label className="text-xs font-semibold text-slate-700"');

// Fix the Select Contact inputs to have full width properly in a row
content = content.replace(/<div className="flex gap-1\.5">/g, '<div className="flex gap-2">');
// Change w-1/2 to flex-1 for better scaling
content = content.replace(/w-1\/2/g, 'flex-1');

// Fix City/Town and Postcode row (currently has sub-label embedded)
// <div className="flex items-center gap-1.5">
//   <input ... className="flex-1 ..." />
//   <label className="text-xs font-semibold text-slate-600">Postcode</label>
//   <input ... className="w-24 ..." />
// </div>
// This needs to be completely rewritten for this specific row.
// Actually, it's easier to just do it via standard text replace for that one block:
const cityPostcodeRegex = /<div className="grid grid-cols-\[110px_1fr\] items-center gap-1\.5">[\s\S]*?<label className="text-xs font-semibold text-slate-600 text-right">City\/Town<\/label>[\s\S]*?<div className="flex items-center gap-1\.5">[\s\S]*?<input value={formData\.city}[^>]*>[\s\S]*?<label className="text-xs font-semibold text-slate-600">Postcode<\/label>[\s\S]*?<input value={formData\.postcode}[^>]*>[\s\S]*?<\/div>[\s\S]*?<\/div>/;

// I'll just change the inner div to flex gap-2 instead of rewriting the whole thing, wait, no, the Postcode label inside needs to look good.
// The best way for City and Postcode in stacked layout is:
// <div className="flex gap-2">
//   <div className="flex flex-col gap-1 flex-1">
//     <label>City/Town</label>
//     <input />
//   </div>
//   <div className="flex flex-col gap-1 w-1/3">
//     <label>Postcode</label>
//     <input />
//   </div>
// </div>

const cityPostcodeReplacement = `<div className="flex gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs font-semibold text-slate-700">City/Town</label>
                  <input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="City/Town" className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
                </div>
                <div className="flex flex-col gap-1 w-28">
                  <label className="text-xs font-semibold text-slate-700">Postcode</label>
                  <input value={formData.postcode} onChange={e => setFormData({ ...formData, postcode: e.target.value })} placeholder="Postcode" className="w-full text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 uppercase focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-shadow" />
                </div>
              </div>`;

content = content.replace(/<div className="flex flex-col gap-1">\s*<label className="text-xs font-semibold text-slate-700">City\/Town<\/label>\s*<div className="flex items-center gap-1\.5">\s*<input value={formData\.city}[^>]*>\s*<label className="text-xs font-semibold text-slate-600">Postcode<\/label>\s*<input value={formData\.postcode}[^>]*>\s*<\/div>\s*<\/div>/, cityPostcodeReplacement);

// Make all inputs slightly larger padding so they don't look starved in stacked layout
content = content.replace(/px-2 py-1/g, 'px-2.5 py-1.5');
content = content.replace(/gap-y-2/g, 'gap-y-4');
content = content.replace(/space-y-3/g, 'space-y-4');


fs.writeFileSync('NewClientModal.tsx', content);
