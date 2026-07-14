(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))c(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const u of a.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&c(u)}).observe(document,{childList:!0,subtree:!0});function s(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function c(r){if(r.ep)return;r.ep=!0;const a=s(r);fetch(r.href,a)}})();const x="buy-later-goblin-items",y=["Produce","Dairy","Meat","Pantry","Frozen","Household","Other"];let d=$();function q(){return crypto.randomUUID()}function $(){try{const t=localStorage.getItem(x);if(!t)return[];const o=JSON.parse(t);return Array.isArray(o)?o.filter(s=>typeof s=="object"&&s!==null&&typeof s.id=="string"&&typeof s.name=="string"):[]}catch{return[]}}function m(){localStorage.setItem(x,JSON.stringify(d))}function E(t){return y.find(s=>s.toLowerCase()===t.toLowerCase())??"Other"}function v(){const t=document.querySelector("#goal");if(!t)return;const o=t.value.trim();o&&(d.push({id:q(),name:o,quantity:"",section:"Other",bought:!1}),t.value="",m(),g())}function h(t,o){const s=d.findIndex(c=>c.id===t);s!==-1&&(d[s]={...d[s],...o},m(),g())}function L(t){d=d.filter(o=>o.id!==t),m(),g()}function w(){d=d.filter(t=>!t.bought),m(),g()}function O(){const t=d.filter(o=>!o.bought).length;return d.length===0?"No goblins yet. Add one before it escapes.":t===0?"All goblins caught. Loot secured.":`<span class="num">${t}</span> goblin${t===1?"":"s"} left to catch.`}const b=[{id:"gpt-5-nano",provider:"openai",contextK:128,flavor:"fast generalist"},{id:"gpt-4o-mini",provider:"openai",contextK:128,flavor:"reliable generalist"},{id:"claude-sonnet-4",provider:"anthropic",contextK:200,flavor:"nuanced, good at lists"},{id:"gemini-2.0-flash",provider:"google",contextK:1e3,flavor:"long-context, fast"},{id:"llama-3.3-70b",provider:"meta",contextK:128,flavor:"open-source generalist"},{id:"deepseek-chat",provider:"deepseek",contextK:64,flavor:"cheap, decent reasoning"},{id:"qwen-2.5-72b",provider:"alibaba",contextK:128,flavor:"strong multilingual"},{id:"mistral-large",provider:"mistral",contextK:128,flavor:"European, structured output"}],k="gpt-5-nano",I="gpt-5-nano";async function A(t,o){var u;const c=`You are a routing judge. Pick the single best free model from the catalog for the task below. Reply with ONLY this JSON, no markdown:
{"model":"<id>","reason":"<one short sentence>"}

Catalog:
${b.map(l=>`- ${l.id} | provider=${l.provider} | context=${l.contextK}k | ${l.flavor}`).join(`
`)}

Task: shopping list for goal "${t}", spiceness ${o}/5.`;try{const l=await puter.ai.chat(c,{model:k,temperature:0}),i=(typeof l=="string"?l:((u=l.message)==null?void 0:u.content)??"").match(/\{[\s\S]*\}/);if(i){const n=JSON.parse(i[0]),p=b.find(f=>f.id===n.model);if(p)return console.log(`[goblin-router] chose: ${p.id} (reason: ${n.reason??"n/a"})`),p}}catch(l){console.warn("[goblin-router] judge failed, falling back to round-robin",l)}const r=(t.length+o)%b.length,a=b[r];return console.log(`[goblin-router] judge unavailable, picked: ${a.id} (round-robin)`),a}async function N(t,o){var a;const s=await A(t,o),c=`You are a shopping list assistant. Break down this goal into a shopping list: "${t}"

Spiciness level: ${o}/5. Higher spiciness means more creative, unusual, or detailed items.

Return ONLY valid JSON with this exact shape, no markdown, no explanation:
{
  "items": [
    { "name": "item name", "quantity": "short quantity", "section": "Produce|Dairy|Meat|Pantry|Frozen|Household|Other" }
  ]
}`,r=[];for(const u of[s.id,I])try{const l=await puter.ai.chat(c,{model:u,temperature:.2}),i=(typeof l=="string"?l:((a=l.message)==null?void 0:a.content)??"").match(/\{[\s\S]*\}/);if(!i)throw new Error("No JSON found in response");const n=JSON.parse(i[0]);if(!n.items||!Array.isArray(n.items))throw new Error("Missing items array");return u!==s.id&&console.log(`[goblin-router] fallback to ${u} succeeded`),n.items.map(p=>({id:q(),name:String(p.name??"").trim(),quantity:String(p.quantity??"").trim(),section:E(String(p.section??"Other")),bought:!1}))}catch(l){r.push(l),console.warn(`[goblin-router] ${u} failed:`,l)}throw r[r.length-1]??new Error("All models failed")}async function C(){const t=document.querySelector("#goal"),o=document.querySelector("#spice"),s=document.querySelector("#goblin-btn"),c=document.querySelector("#status");if(!t||!o||!s||!c)return;const r=t.value.trim();if(r){s.disabled=!0,s.textContent="Thinking...",c.textContent="",c.className="status";try{const a=await N(r,parseInt(o.value,10));d.push(...a),m(),t.value="",c.textContent=`The goblin found ${a.length} thing${a.length===1?"":"s"}.`,c.className="status success"}catch{c.textContent="The goblin tripped. Add items manually or try again.",c.className="status error"}finally{s.disabled=!1,s.textContent="Goblin it",g()}}}function g(){var r,a,u,l;const t=document.querySelector("#app"),o=new Map;for(const e of y)o.set(e,[]);for(const e of d)(o.get(e.section)??o.get("Other")).push(e);let s=`
    <header class="header">
      <h1>Buy Later <span class="goblin">Goblin</span></h1>
      <p class="helper">type a vague goal. goblin sorts the loot.</p>
    </header>
    <div class="controls">
      <div class="input-row">
        <input id="goal" type="text" placeholder="taco night, camping breakfast, cleaning day..." autocomplete="off" />
        <button id="add-btn" class="btn-primary">Add</button>
      </div>
      <div class="spice-row">
        <span class="spice-label">Spice</span>
        <span class="spice-value" id="spice-label">3</span>
        <input id="spice" type="range" min="1" max="5" value="3" />
        <span class="spice-peppers" id="spice-peppers">🌶️🌶️🌶️</span>
        <button id="goblin-btn" class="btn-primary">Goblin it</button>
      </div>
    </div>
    <div class="status" id="status"></div>
    <div class="count">${O()}</div>
  `;if(d.length===0)s+=`
      <div class="empty-state">
        <div class="goblin-face">👺</div>
        <p>no goblins yet.<br>type something above and hit<br>"goblin it" or "add".</p>
      </div>
    `;else{for(const[e,i]of o)if(i.length!==0){s+=`<div class="section-group"><div class="section-title">${e}</div>`;for(const n of i){const p=n.bought?" bought":"";s+=`
          <div class="item" data-id="${n.id}">
            <input type="checkbox" class="bought-cb" ${n.bought?"checked":""} />
            <input type="text" class="name${p}" value="${S(n.name)}" />
            <input type="text" class="qty" value="${S(n.quantity)}" placeholder="qty" />
            <select class="section-select">
              ${y.map(f=>`<option value="${f}"${f===n.section?" selected":""}>${f}</option>`).join("")}
            </select>
            <button class="btn-danger delete-btn">✕</button>
          </div>
        `}s+="</div>"}d.some(e=>e.bought)&&(s+='<div class="clear-row"><button id="clear-btn" class="btn-secondary">Clear bought</button></div>')}t.innerHTML=s,(r=document.querySelector("#add-btn"))==null||r.addEventListener("click",v),(a=document.querySelector("#goal"))==null||a.addEventListener("keydown",e=>{e.key==="Enter"&&v()}),(u=document.querySelector("#clear-btn"))==null||u.addEventListener("click",w),(l=document.querySelector("#goblin-btn"))==null||l.addEventListener("click",C);const c=document.querySelector("#spice");c==null||c.addEventListener("input",()=>{const e=c.value,i=document.querySelector("#spice-label"),n=document.querySelector("#spice-peppers");i&&(i.textContent=e),n&&(n.textContent="🌶️".repeat(parseInt(e,10)))}),document.querySelectorAll(".bought-cb").forEach(e=>{e.addEventListener("change",()=>{var n;const i=(n=e.closest(".item"))==null?void 0:n.dataset.id;i&&h(i,{bought:e.checked})})}),document.querySelectorAll(".name").forEach(e=>{e.addEventListener("change",()=>{var n;const i=(n=e.closest(".item"))==null?void 0:n.dataset.id;i&&h(i,{name:e.value.trim()||"Unnamed"})})}),document.querySelectorAll(".qty").forEach(e=>{e.addEventListener("change",()=>{var n;const i=(n=e.closest(".item"))==null?void 0:n.dataset.id;i&&h(i,{quantity:e.value.trim()})})}),document.querySelectorAll(".section-select").forEach(e=>{e.addEventListener("change",()=>{var n;const i=(n=e.closest(".item"))==null?void 0:n.dataset.id;i&&h(i,{section:E(e.value)})})}),document.querySelectorAll(".delete-btn").forEach(e=>{e.addEventListener("click",()=>{var n;const i=(n=e.closest(".item"))==null?void 0:n.dataset.id;i&&L(i)})})}function S(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}g();
