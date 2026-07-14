(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))r(i);new MutationObserver(i=>{for(const a of i)if(a.type==="childList")for(const u of a.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&r(u)}).observe(document,{childList:!0,subtree:!0});function n(i){const a={};return i.integrity&&(a.integrity=i.integrity),i.referrerPolicy&&(a.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?a.credentials="include":i.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function r(i){if(i.ep)return;i.ep=!0;const a=n(i);fetch(i.href,a)}})();const v="buy-later-goblin-items",h=["Produce","Dairy","Meat","Pantry","Frozen","Household","Other"];let l=L();function S(){return crypto.randomUUID()}function L(){try{const t=localStorage.getItem(v);if(!t)return[];const o=JSON.parse(t);return Array.isArray(o)?o.filter(n=>typeof n=="object"&&n!==null&&typeof n.id=="string"&&typeof n.name=="string"):[]}catch{return[]}}function m(){localStorage.setItem(v,JSON.stringify(l))}function q(t){return h.find(n=>n.toLowerCase()===t.toLowerCase())??"Other"}function y(){const t=document.querySelector("#goal");if(!t)return;const o=t.value.trim();o&&(l.push({id:S(),name:o,quantity:"",section:"Other",bought:!1}),t.value="",m(),d())}function f(t,o){const n=l.findIndex(r=>r.id===t);n!==-1&&(l[n]={...l[n],...o},m(),d())}function O(t){l=l.filter(o=>o.id!==t),m(),d()}function x(){l=l.filter(t=>!t.bought),m(),d()}function I(){const t=l.filter(o=>!o.bought).length;return l.length===0?"No goblins yet. Add one before it escapes.":t===0?"All goblins caught. Loot secured.":`<span class="num">${t}</span> goblin${t===1?"":"s"} left to catch.`}async function $(t,o){var p;const n=`You are a shopping list assistant. Break down this goal into a shopping list: "${t}"

Spiciness level: ${o}/5. Higher spiciness means more creative, unusual, or detailed items.

Return ONLY valid JSON with this exact shape, no markdown, no explanation:
{
  "items": [
    { "name": "item name", "quantity": "short quantity", "section": "Produce|Dairy|Meat|Pantry|Frozen|Household|Other" }
  ]
}`,r=await puter.ai.chat(n,{model:"gpt-5-nano",temperature:.2}),a=(typeof r=="string"?r:((p=r.message)==null?void 0:p.content)??"").match(/\{[\s\S]*\}/);if(!a)throw new Error("No JSON found in response");const u=JSON.parse(a[0]);if(!u.items||!Array.isArray(u.items))throw new Error("Missing items array");return u.items.map(e=>({id:S(),name:String(e.name??"").trim(),quantity:String(e.quantity??"").trim(),section:q(String(e.section??"Other")),bought:!1}))}async function w(){const t=document.querySelector("#goal"),o=document.querySelector("#spice"),n=document.querySelector("#goblin-btn"),r=document.querySelector("#status");if(!t||!o||!n||!r)return;const i=t.value.trim();if(i){n.disabled=!0,n.textContent="Thinking...",r.textContent="",r.className="status";try{const a=await $(i,parseInt(o.value,10));l.push(...a),m(),t.value="",r.textContent=`The goblin found ${a.length} thing${a.length===1?"":"s"}.`,r.className="status success"}catch{r.textContent="The goblin tripped. Add items manually or try again.",r.className="status error"}finally{n.disabled=!1,n.textContent="Goblin it",d()}}}function d(){var i,a,u,p;const t=document.querySelector("#app"),o=new Map;for(const e of h)o.set(e,[]);for(const e of l)(o.get(e.section)??o.get("Other")).push(e);let n=`
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
    <div class="count">${I()}</div>
  `;if(l.length===0)n+=`
      <div class="empty-state">
        <div class="goblin-face">👺</div>
        <p>no goblins yet.<br>type something above and hit<br>"goblin it" or "add".</p>
      </div>
    `;else{for(const[e,c]of o)if(c.length!==0){n+=`<div class="section-group"><div class="section-title">${e}</div>`;for(const s of c){const E=s.bought?" bought":"";n+=`
          <div class="item" data-id="${s.id}">
            <input type="checkbox" class="bought-cb" ${s.bought?"checked":""} />
            <input type="text" class="name${E}" value="${b(s.name)}" />
            <input type="text" class="qty" value="${b(s.quantity)}" placeholder="qty" />
            <select class="section-select">
              ${h.map(g=>`<option value="${g}"${g===s.section?" selected":""}>${g}</option>`).join("")}
            </select>
            <button class="btn-danger delete-btn">✕</button>
          </div>
        `}n+="</div>"}l.some(e=>e.bought)&&(n+='<div class="clear-row"><button id="clear-btn" class="btn-secondary">Clear bought</button></div>')}t.innerHTML=n,(i=document.querySelector("#add-btn"))==null||i.addEventListener("click",y),(a=document.querySelector("#goal"))==null||a.addEventListener("keydown",e=>{e.key==="Enter"&&y()}),(u=document.querySelector("#clear-btn"))==null||u.addEventListener("click",x),(p=document.querySelector("#goblin-btn"))==null||p.addEventListener("click",w);const r=document.querySelector("#spice");r==null||r.addEventListener("input",()=>{const e=r.value,c=document.querySelector("#spice-label"),s=document.querySelector("#spice-peppers");c&&(c.textContent=e),s&&(s.textContent="🌶️".repeat(parseInt(e,10)))}),document.querySelectorAll(".bought-cb").forEach(e=>{e.addEventListener("change",()=>{var s;const c=(s=e.closest(".item"))==null?void 0:s.dataset.id;c&&f(c,{bought:e.checked})})}),document.querySelectorAll(".name").forEach(e=>{e.addEventListener("change",()=>{var s;const c=(s=e.closest(".item"))==null?void 0:s.dataset.id;c&&f(c,{name:e.value.trim()||"Unnamed"})})}),document.querySelectorAll(".qty").forEach(e=>{e.addEventListener("change",()=>{var s;const c=(s=e.closest(".item"))==null?void 0:s.dataset.id;c&&f(c,{quantity:e.value.trim()})})}),document.querySelectorAll(".section-select").forEach(e=>{e.addEventListener("change",()=>{var s;const c=(s=e.closest(".item"))==null?void 0:s.dataset.id;c&&f(c,{section:q(e.value)})})}),document.querySelectorAll(".delete-btn").forEach(e=>{e.addEventListener("click",()=>{var s;const c=(s=e.closest(".item"))==null?void 0:s.dataset.id;c&&O(c)})})}function b(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}d();
