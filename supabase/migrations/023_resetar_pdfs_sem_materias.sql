-- Migration 023: Reseta pdf_processado para editais que têm link de PDF
-- mas não têm matérias capturadas. O crawler vai reprocessá-los na próxima execução.

update editais
set pdf_processado = false
where
  pdf_processado = true
  and (materias is null or materias = '{}')
  and link_edital_pdf is not null
  and status = 'ativo';
