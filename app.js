const game = {
    energy: 0, lifetime: 0, shards: 0, cps: 0, 
    paused: false, clicking: false, phase: 0, maxCh: 1, 
    cooldown: 0, pendingChampion: null,

    companions: [
        { id:0, name:'Coco Mystic Octopus', cost:15, pow:1, count:0, isChamp:false, img:'https://i.ibb.co/qMhJR7Hz/Coco-the-Mystic-Octopus.png' },
        { id:1, name:'Baby Bunny Forest Guide', cost:100, pow:2, count:0, isChamp:false, img:'https://i.ibb.co/1fbZZGT2/Baby-Bunny-the-Forest-Guide.png' },
        { id:2, name:'Pio Pio Healing Chick', cost:1100, pow:0.15, count:0, isChamp:false, img:'https://i.ibb.co/7sLrntn/Pio-Pio-the-Healing-Chick.png' },
        { id:3, name:'Ivan Guardian Bear', cost:12000, pow:50, count:0, isChamp:false, img:'https://i.ibb.co/LDZxCSvh/Ivan-the-Guardian-Bear.png' }
    ],

    init() {
        const canvas = document.getElementById('particle-canvas');
        this.ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        
        this.load();
        this.render();
        setInterval(() => !this.paused && this.logic(), 1000);
        setInterval(() => !this.paused && this.ui(), 100);
        setInterval(() => this.save(), 5000);
        this.loop();
    },

    save() {
        localStorage.setItem('wooden_soup_v4', JSON.stringify({
            e: this.energy, l: this.lifetime, s: this.shards, cd: this.cooldown,
            c: this.companions.map(x => ({ct: x.count, ch: x.isChamp}))
        }));
    },

    load() {
        const data = JSON.parse(localStorage.getItem('wooden_soup_v4'));
        if(data) {
            this.energy = data.e; this.lifetime = data.l; this.shards = data.s; this.cooldown = data.cd;
            data.c.forEach((x, i) => { if(this.companions[i]) { this.companions[i].count = x.ct; this.companions[i].isChamp = x.ch; } });
        }
        this.rebuildSidebar();
    },

    logic() {
        let base = (this.companions[0].count * 1 * (this.companions[0].isChamp?2:1)) + (this.companions[3].count * 50 * (this.companions[3].isChamp?2:1));
        let mult = (1 + (this.companions[2].count * 0.15 * (this.companions[2].isChamp?2:1))) * (1 + this.shards * 0.5);
        this.cps = base * mult;
        this.energy += this.cps; this.lifetime += this.cps;
        if(this.cooldown > 0) this.cooldown--;
    },

    ui() {
        document.getElementById('energy-display').innerText = Math.floor(this.energy).toLocaleString();
        document.getElementById('cps-display').innerText = `${this.cps.toFixed(1)} EB PER SECOND`;
        
        const goal = 25e6 * Math.pow(5, this.shards);
        const pBtn = document.getElementById('btn-prestige');
        pBtn.className = this.energy >= goal ? 'unlocked' : 'locked';
        document.getElementById('prestige-text').innerText = this.energy >= goal ? "[ AWAKEN SOUL ]" : `Requires ${goal.toLocaleString()} EB`;
        document.getElementById('prestige-stat-text').innerText = `Angel Awakening Lv. ${this.shards} (+${this.shards * 50}%)`;

        this.updateLore();
        const pSide = document.getElementById('prix-btn-sidebar');
        pSide.className = (this.companions[0].count > 0 && this.cooldown <= 0) ? 'unlocked' : '';
        pSide.innerText = this.cooldown > 0 ? `CD: ${Math.floor(this.cooldown/60)}:${(this.cooldown%60).toString().padStart(2,'0')}` : "Enter Grand Prix";
        
        document.querySelectorAll('.companion-card').forEach((c, i) => c.className = `companion-card ${this.energy >= this.companions[i].cost ? 'affordable' : ''}`);
    },

    updateLore() {
        const lore = ["Skullchef has arrived from Esquelotia to heal Earth.", "The entity was stealing love from Esquelotia. Light was fading.", "Small Angel gave his physical life to heal his home planet.", "Skullchef embarked on this journey. His soup has Angel's soul.", "The soup is ready. Activate the Awakening to release the mantle.", "Success. Wave two of purification begins now."];
        let ch = 1;
        if(this.shards > 0) ch = 6;
        else [0, 1000, 50000, 500000, 1000000].forEach((t, i) => { if(this.lifetime >= t) ch = i+1; });
        document.getElementById('lore-text').innerText = lore[ch-1];
        document.getElementById('lore-title').innerText = `Chronicle ${ch}`;
        this.chMult = ch;
    },

    click(e) {
        if(this.paused || e.target.closest('#side-shop') || e.target.closest('#altar-panel')) return;
        this.clicking = true;
        const val = (this.chMult * Math.pow(2, this.companions[1].count * (this.companions[1].isChamp?2:1))) * (1 + this.shards * 0.5);
        this.energy += val; this.lifetime += val;

        const s = document.getElementById('audio-stir').cloneNode(); s.volume = 0.3; s.play().catch(()=>{});
        document.getElementById('asset-spoon').classList.add('manual-stir');
        document.getElementById('asset-soup').classList.add('soup-ripple-active');
        setTimeout(() => { 
            document.getElementById('asset-spoon').classList.remove('manual-stir'); 
            document.getElementById('asset-soup').classList.remove('soup-ripple-active');
            this.clicking = false; 
        }, 120);
        this.createParticles(window.innerWidth/2, window.innerHeight/2 + 100, 'energy');
    },

    buyCompanion(i) {
        const c = this.companions[i];
        if (this.energy >= c.cost) {
            this.energy -= c.cost; c.count++; c.cost = Math.floor(c.cost * 1.15);
            this.triggerSummon(c); this.render();
        }
    },

    triggerSummon(c) {
        const h = document.createElement('img'); h.src = c.img; h.className = 'summon-clone'; h.style.width="300px";
        document.body.appendChild(h);
        setTimeout(() => h.classList.add('summon-active'), 20);
        setTimeout(() => {
            let slot = document.getElementById(`slot-${c.id}`) || this.createSlot(c);
            let r = slot.getBoundingClientRect();
            h.style.left = r.left + 45 + 'px'; h.style.top = r.top + 45 + 'px';
            h.style.transform = 'translate(-50%,-50%) scale(0.35) rotate(0deg)';
            setTimeout(() => { h.remove(); slot.querySelector('.lv-badge').innerText = `Lv. ${c.count}`; }, 1100);
        }, 1500);
    },

    createSlot(c) {
        const slot = document.createElement('div'); slot.id = `slot-${c.id}`; slot.className = 'companion-slot';
        slot.innerHTML = `<img src="${c.img}" class="slot-img"><div class="lv-badge">Lv. ${c.count}</div>${c.isChamp ? '<div class="slot-crown">👑</div>' : ''}`;
        document.getElementById('companion-column').appendChild(slot);
        return slot;
    },

    rebuildSidebar() {
        document.getElementById('companion-column').innerHTML = '';
        this.companions.forEach(c => { if(c.count > 0) this.createSlot(c); });
    },

    render() {
        const l = document.getElementById('companion-list'); l.innerHTML = '';
        this.companions.forEach((c, i) => {
            const card = document.createElement('div');
            let pwr = (c.id === 0 ? 1 : (c.id === 1 ? 2 : (c.id === 2 ? 15 : 50))) * (1 + this.shards * 0.5);
            let desc = c.id === 2 ? `+${pwr.toFixed(1)}% Prod` : `+${pwr.toFixed(1)} EB/s`;
            let angel = this.shards > 0 ? `<br><span style="color:#4ade80;font-size:0.6rem;">(+${this.shards*50}% Angel Power!)</span>` : '';
            card.innerHTML = `<img src="${c.img}" class="comp-img"><div style="flex:1"><b>${c.name} (${c.count})</b><div style="font-size:0.7rem;color:#cbd5e1">${desc}${angel}</div>${c.isChamp ? '<span class="champ-banner">👑 CHAMPION (x2!)</span>' : ''}<span style="color:#fbbf24;font-weight:bold;display:block;">${Math.floor(c.cost).toLocaleString()} EB</span></div>`;
            card.onclick = () => this.buyCompanion(i);
            l.appendChild(card);
        });
    },

    // --- NEW REVISED VICTORY CORONATION ---
    triggerCoronation(c) {
        this.paused = true;
        const scene = document.getElementById('coronation-scene');
        const plush = document.getElementById('coronation-plushie');
        const crown = document.getElementById('main-falling-crown');
        
        plush.src = c.img;
        scene.style.display = 'flex';
        
        setTimeout(() => {
            crown.classList.add('crown-drop-final');
            // Flash Effect
            document.body.style.filter = 'brightness(2)';
            setTimeout(() => document.body.style.filter = 'none', 200);

            setTimeout(() => {
                // Shrink and dock
                scene.style.transition = "all 1s ease-in-out";
                scene.style.transform = "scale(0.1) translate(-1000px, 0)";
                scene.style.opacity = "0";
                
                setTimeout(() => {
                    scene.style.display = 'none';
                    scene.style.transform = "none";
                    scene.style.opacity = "1";
                    crown.classList.remove('crown-drop-final');
                    this.paused = false;
                    this.rebuildSidebar();
                    this.render();
                }, 1000);
            }, 2000);
        }, 100);
    },

    handlePrestigeClick() {
        let goal = 25e6 * Math.pow(5, this.shards);
        if (this.energy < goal) return;
        this.paused = true;
        document.getElementById('angel-showcase').classList.add('active');
        setTimeout(() => {
            document.getElementById('white-out').style.opacity = '1';
            setTimeout(() => {
                this.shards++; this.energy = 0; this.lifetime = 0;
                this.companions.forEach(c => { c.count = 0; c.isChamp = false; c.cost = (c.id === 0 ? 15 : (c.id === 1 ? 100 : (c.id === 2 ? 1100 : 12000))); });
                this.rebuildSidebar(); this.render();
                document.getElementById('white-out').style.opacity = '0';
                document.getElementById('angel-showcase').classList.remove('active');
                this.paused = false;
            }, 1500);
        }, 2000);
    },

    loop() {
        const sp = document.getElementById('spoon-rig'), so = document.getElementById('asset-soup');
        if(!this.paused && this.cps > 0 && !this.clicking) {
            this.phase += (0.04 + Math.log10(this.cps+1)*0.05);
            sp.style.transform = `translate(-50%,-50%) rotate(${-27+Math.sin(this.phase)*5}deg)`;
            so.style.transform = `translate(-50%,-50%) scaleY(${1+Math.sin(this.phase)*0.012})`;
        }
        this.drawPart(); requestAnimationFrame(()=>this.loop());
    },

    createParticles(x, y, type) {
        for(let i=0; i<8; i++) this.particles.push({ x, y, type, vx:(Math.random()-0.5)*10, vy:(Math.random()-0.5)*10-(type==='energy'?5:0), life:1, size:Math.random()*8+4, color:type==='magic'?'#fff':'#a5f3fc' });
    },

    particles: [],
    drawPart() {
        this.ctx.clearRect(0,0,this.ctx.canvas.width,this.ctx.canvas.height);
        this.particles.forEach((p, i) => {
            if(p.type==='energy') { p.vx+=(window.innerWidth/2-p.x)*0.003; p.vy+=(60-p.y)*0.003; }
            p.x+=p.vx; p.y+=p.vy; p.life-=0.015; this.ctx.fillStyle=p.color; this.ctx.globalAlpha=p.life;
            this.ctx.beginPath(); this.ctx.arc(p.x,p.y,p.size,0,Math.PI*2); this.ctx.fill();
            if(p.life<=0) this.particles.splice(i,1);
        });
    }
};

const prix = {
    active: false, racers: [], tick: null, champ: null, won: false,
    open() {
        if(game.cooldown > 0 || game.companions[0].count === 0) return;
        game.paused = true; document.getElementById('race-modal').style.display='flex';
        document.getElementById('prix-sel-ui').style.display='block'; document.getElementById('prix-run-ui').style.display='none'; document.getElementById('prix-end-ui').style.display='none';
        const l = document.getElementById('prix-selector-list'); l.innerHTML = '';
        game.companions.filter(c => c.count > 0).forEach(c => {
            const d = document.createElement('div'); d.className='prix-select-card';
            d.innerHTML = `<img src="${c.img}" style="width:80px;"><p>${c.name}</p>`;
            d.onclick = () => this.start(c); l.appendChild(d);
        });
    },
    start(c) {
        this.champ = c; document.getElementById('prix-sel-ui').style.display='none'; document.getElementById('prix-run-ui').style.display='flex';
        for(let i=0; i<4; i++) document.getElementById(`lane-${i}`).innerHTML = '';
        this.racers = [{id:c.id, pos:0, img:c.img, isP:true, lane:0}, ...game.companions.filter(co=>co.id!==c.id).map((co,i)=>({id:co.id, pos:0, img:co.img, isP:false, lane:i+1}))];
        this.racers.forEach(r => { const im = document.createElement('img'); im.id=`r-${r.lane}`; im.src=r.img; im.className='racer-img'; document.getElementById(`lane-${r.lane}`).appendChild(im); });
        let cd = 3; const box = document.getElementById('prix-timer');
        const itv = setInterval(() => { box.innerText = cd > 0 ? cd : "GO!"; if(cd < 0) { clearInterval(itv); box.innerText = ""; this.begin(); } cd--; }, 1000);
    },
    begin() { this.active = true; this.tick = setInterval(() => { this.racers.slice(1).forEach(r => r.pos += Math.random()*3.5); this.upd(); this.check(); }, 100); },
    playerClick() { if(this.active) { this.racers[0].pos += 8; this.upd(); } },
    upd() { this.racers.forEach(r => { const el = document.getElementById(`r-${r.lane}`); if(el) el.style.bottom = (10+(r.pos/100)*75)+'%'; }); },
    check() { const w = this.racers.find(r => r.pos >= 100); if(w) { this.active = false; clearInterval(this.tick); this.won = w.isP; this.end(); } },
    end() {
        document.getElementById('prix-run-ui').style.display='none'; document.getElementById('prix-end-ui').style.display='block';
        const r = document.getElementById('prix-rank'), m = document.getElementById('prix-reward-msg');
        if(this.won) { r.innerText="1ST PLACE!"; m.innerText=`VICTORY! Return to celebrate the coronation of ${this.champ.name}!`; this.champ.isChamp = true; }
        else { let goal = 25e6 * Math.pow(5, game.shards); let con = Math.floor(goal*0.01); r.innerText="DEFEAT!"; m.innerText=`Award: +${con.toLocaleString()} Energy Balls!`; game.energy += con; }
    },
    handleReturn() {
        document.getElementById('race-modal').style.display='none';
        if(this.won) { game.triggerCoronation(this.champ); } else { game.paused = false; }
        game.cooldown = 600;
    },
    close() { this.active = false; clearInterval(this.tick); document.getElementById('race-modal').style.display='none'; game.paused = false; }
};

window.onload = () => game.init();