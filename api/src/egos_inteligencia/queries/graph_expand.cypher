MATCH (center) WHERE elementId(center) = $entity_id
  AND (center:Person OR center:Company OR center:Contract OR center:Sanction OR center:Election
       OR center:Amendment OR center:Finance OR center:Embargo OR center:Health OR center:Education
       OR center:Convenio OR center:LaborStats OR center:PublicOffice
       OR center:OffshoreEntity OR center:OffshoreOfficer OR center:GlobalPEP
       OR center:CVMProceeding OR center:Expense)
CALL apoc.path.subgraphAll(center, {
  relationshipFilter: "SOCIO_DE|DOOU|CANDIDATO_EM|VENCEU|AUTOR_EMENDA|SANCIONADA|OPERA_UNIDADE|DEVE|RECEBEU_EMPRESTIMO|EMBARGADA|MANTEDORA_DE|BENEFICIOU|GEROU_CONVENIO|SAME_AS|POSSIBLY_SAME_AS|OFFICER_OF|INTERMEDIARY_OF|GLOBAL_PEP_MATCH|CVM_SANCIONADA|GASTOU|FORNECEU",
  labelFilter: $label_filter,
  maxLevel: $depth,
  limit: 200
})
YIELD nodes, relationships
RETURN nodes, relationships, elementId(center) AS center_id