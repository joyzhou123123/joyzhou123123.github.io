/* Shared client-side localization for the website and the self-contained edition. */
(() => {
  const dictionaries=window.PORTFOLIO_TRANSLATIONS||{};
  const english=dictionaries.en||{};
  const reverse=Object.fromEntries(Object.entries(english).map(([k,v])=>[v,k]));
  const allowed=['en','zh','ko'];
  const normal=value=>({cn:'zh','zh-cn':'zh',kr:'ko'}[String(value).toLowerCase()]||String(value).toLowerCase());
  const names={en:'Language',zh:'语言',ko:'언어'};
  const titles={en:'English',zh:'简体中文',ko:'한국어'};
  let stored='en';
  try {stored=localStorage.getItem('joy-portfolio-language')||'en'}catch{}
  try {if(window.parent!==window&&window.parent.__portfolioLocale)stored=window.parent.__portfolioLocale}catch{}
  const query=normal(new URLSearchParams(location.search).get('lang')||'');
  let locale=allowed.includes(query)?query:normal(stored);
  if(!allowed.includes(locale))locale='en';
  const header=document.querySelector('.nav-inner,.case-nav-inner,.cv-top');
  const switcher=document.createElement('div');
  switcher.className='language-switch';switcher.setAttribute('role','group');
  switcher.innerHTML=allowed.map((lang,i)=>`<button type="button" data-lang="${lang}" lang="${lang==='zh'?'zh-CN':lang}" title="${titles[lang]}" aria-label="${titles[lang]}" aria-pressed="false">${['EN','CN','KR'][i]}</button>`).join('');
  header?.append(switcher);
  function t(source){return dictionaries[locale]?.[reverse[source]]||source}
  function apply(next,persist=true){
    locale=allowed.includes(next)?next:'en';
    const catalog=dictionaries[locale]||english;
    document.documentElement.lang={en:'en',zh:'zh-CN',ko:'ko'}[locale];
    document.documentElement.dataset.locale=locale;
    for(const element of document.querySelectorAll('[data-i18n],[data-i18n-source]')){
      const key=element.dataset.i18n||reverse[element.dataset.i18nSource];
      const value=catalog[key]??english[key];
      if(value!==undefined)element.innerHTML=value;
    }
    for(const attribute of ['alt','aria-label','data-caption','content','title']){
      for(const element of document.querySelectorAll(`[data-i18n-${attribute}]`)){
        const key=element.getAttribute(`data-i18n-${attribute}`);
        const value=catalog[key]??english[key];
        if(value!==undefined)element.setAttribute(attribute,value);
      }
    }
    switcher.setAttribute('aria-label',names[locale]);
    switcher.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.lang===locale)));
    if(persist){try{localStorage.setItem('joy-portfolio-language',locale)}catch{}}
    try{if(window.parent!==window){window.parent.__portfolioLocale=locale;window.parent.document.documentElement.lang=document.documentElement.lang;window.parent.document.title=document.title}}catch{}
    // Query propagation also works when browser storage is unavailable.
    if(location.protocol==='http:'||location.protocol==='https:'){
      const current=new URL(location.href);current.searchParams.set('lang',locale);history.replaceState(history.state,'',current);
      for(const link of document.querySelectorAll('a[href]')){
        const href=link.getAttribute('href');
        if(!href||href.startsWith('#')||/^(?:[a-z]+:|\/\/)/i.test(href))continue;
        const target=new URL(href,location.href);
        if(target.origin===location.origin&&target.pathname.endsWith('.html')){
          target.searchParams.set('lang',locale);
          link.setAttribute('href',target.pathname.split('/').pop()+target.search+target.hash);
        }
      }
    }
    document.dispatchEvent(new CustomEvent('portfolio:language',{detail:{locale}}));
  }
  switcher.addEventListener('click',event=>{
    const button=event.target.closest('button[data-lang]');if(button)apply(button.dataset.lang);
  });
  window.PortfolioI18n={t,setLanguage:apply,getLanguage:()=>locale};
  apply(locale);
})();
