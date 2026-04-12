export interface ReferenciaLegal {
  textoOriginal: string;
  tipo: 'lei' | 'cf' | 'decreto' | 'codigo' | 'sumula';
  numero?: string;
  ano?: string;
  artigo?: string;
  paragrafo?: string;
  inciso?: string;
  tribunal?: string;
  urlLexml?: string;
}

const PADROES: Array<{ regex: RegExp; tipo: ReferenciaLegal['tipo'] }> = [
  {
    regex: /art(?:igo)?\.?\s*(\d+)[°º]?,?\s*(?:§\s*(\d+)[°º]?)?(?:,?\s*inc(?:iso)?\.?\s*([IVXivx]+))?(?:\s*da\s*)?(?:CF|Constituição Federal)(?:\/88)?/gi,
    tipo: 'cf',
  },
  {
    regex: /[Ll]ei\s+(?:n[°º]?\.?\s*)?(\d[\d.]+)(?:\/(\d{2,4}))?(?:,?\s*art(?:igo)?\.?\s*(\d+))?/g,
    tipo: 'lei',
  },
  {
    regex: /[Dd]ecreto(?:-[Ll]ei)?\s+(?:n[°º]?\.?\s*)?(\d[\d.]+)(?:\/(\d{2,4}))?/g,
    tipo: 'decreto',
  },
  {
    regex: /[Ss]úmula\s+(?:Vinculante\s+)?(?:n[°º]?\.?\s*)?(\d+)(?:\s+(?:do\s+)?(?:STF|STJ|TST|TSE))?/g,
    tipo: 'sumula',
  },
];

export function extrairReferencias(texto: string): ReferenciaLegal[] {
  const referencias: ReferenciaLegal[] = [];

  for (const { regex, tipo } of PADROES) {
    const rClone = new RegExp(regex.source, regex.flags);
    let match;
    while ((match = rClone.exec(texto)) !== null) {
      const ref: ReferenciaLegal = {
        textoOriginal: match[0],
        tipo,
        numero: match[1],
        ano: match[2],
        artigo: match[3],
      };
      ref.urlLexml = montarUrlLexml(ref);
      if (ref.urlLexml) referencias.push(ref);
    }
  }

  return referencias;
}

export function montarUrlLexml(ref: ReferenciaLegal): string {
  if (ref.tipo === 'cf') {
    return `https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm${ref.artigo ? `#art${ref.artigo}` : ''}`;
  }
  if (ref.tipo === 'lei' && ref.numero && ref.ano) {
    const anoFull = ref.ano.length === 2 ? `19${ref.ano}` : ref.ano;
    return `https://www.lexml.gov.br/urn/urn:lex:br:federal:lei:${anoFull};${ref.numero.replace(/\./g, '')}${ref.artigo ? `#art${ref.artigo}` : ''}`;
  }
  if (ref.tipo === 'decreto' && ref.numero && ref.ano) {
    const anoFull = ref.ano.length === 2 ? `19${ref.ano}` : ref.ano;
    return `https://www.lexml.gov.br/urn/urn:lex:br:federal:decreto:${anoFull};${ref.numero.replace(/\./g, '')}`;
  }
  return '';
}
