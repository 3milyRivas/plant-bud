const input=document.getElementById('plantUpload')
const preview=document.getElementById('previewImage')
const dropText=document.getElementById('dropText')
const scanBtn=document.getElementById('scanBtn')
const loadingState=document.getElementById('loadingState')
const resultsBox=document.getElementById('resultsBox')
const emptyState=document.getElementById('emptyState')

function setFile(file){
if(!file)return
const r=new FileReader()
r.onload=e=>{
preview.src=e.target.result
preview.classList.remove('hidden')
dropText.classList.add('hidden')
}
r.readAsDataURL(file)
const dt=new DataTransfer()
dt.items.add(file)
input.files=dt.files
}

input.addEventListener('change',e=>setFile(e.target.files[0]))
document.getElementById('previewBox').addEventListener('dragover',e=>e.preventDefault())
document.getElementById('previewBox').addEventListener('drop',e=>{
e.preventDefault()
setFile(e.dataTransfer.files[0])
})

scanBtn.addEventListener('click',async()=>{
const file=input.files[0]
if(!file)return

loadingState.classList.remove('hidden')
resultsBox.classList.add('hidden')
emptyState.classList.add('hidden')

const fd=new FormData()
fd.append('image',file)

const res=await fetch('/plants/scan',{method:'POST',body:fd})
const data=await res.json()

loadingState.classList.add('hidden')
resultsBox.classList.remove('hidden')

document.getElementById('species').innerText=data.species||'-'
document.getElementById('health').innerText=data.health?.status||'-'
document.getElementById('confidenceText').innerText=(data.confidence??'-')+'%'
document.getElementById('statusText').innerText=data.health?.status||'done'
document.getElementById('reliabilityText').innerText=data.reliability?.level||'-'

document.getElementById('causes').innerHTML=(data.causes||[]).map(c=>`<li>${c}</li>`).join('')

const edu=data.plant_education
if(edu){
document.getElementById('education').innerHTML=`
<p>${edu.description||''}</p>
<p><b>Facts:</b></p><ul>${(edu.facts||[]).map(f=>`<li>${f}</li>`).join('')}</ul>
<p><b>Interesting:</b></p><ul>${(edu.interesting_facts||[]).map(f=>`<li>${f}</li>`).join('')}</ul>
`
}

document.getElementById('tips').innerHTML=(data.plant_education?.care_guide?.general||[]).map(t=>`<li>${t}</li>`).join('')

document.getElementById('matches').innerHTML=(data.matches||[]).map(m=>
`<div onclick="window.open('${m.google_search}','_blank')" class="cursor-pointer hover:scale-105 transition bg-white/5 border border-white/10 rounded-xl overflow-hidden">
<img src="${m.image||''}" class="w-full h-28 object-cover">
<div class="p-2">
<p class="text-white text-sm font-bold">${m.name}</p>
<p class="text-[#EDE7D6] text-xs">${m.confidence}%</p>
</div>
</div>`
).join('')
})