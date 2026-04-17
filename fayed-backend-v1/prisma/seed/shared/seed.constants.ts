/**
 * Deterministic IDs keep seeds idempotent and easy to reference across modules.
 * They are intentionally stable to avoid accidental duplicated graph creation.
 */
export const seedIds = {
  users: {
    superAdmin: '11111111-1111-4111-8111-111111111111',
    supportAgent: '11111111-1111-4111-8111-111111111112',
    contentReviewer: '11111111-1111-4111-8111-111111111113',
    patientA: '11111111-1111-4111-8111-111111111114',
    patientB: '11111111-1111-4111-8111-111111111115',
    practitionerA: '11111111-1111-4111-8111-111111111116',
    practitionerB: '11111111-1111-4111-8111-111111111117',
    practitionerC: '11111111-1111-4111-8111-111111111118',
    practitionerD: '11111111-1111-4111-8111-111111111119',
    practitionerE: '11111111-1111-4111-8111-111111111120',
    practitionerF: '11111111-1111-4111-8111-111111111121',
    practitionerG: '11111111-1111-4111-8111-111111111122',
    practitionerH: '11111111-1111-4111-8111-111111111123',
    practitionerI: '11111111-1111-4111-8111-111111111124',
    practitionerJ: '11111111-1111-4111-8111-111111111125',
  },
  countries: {
    egypt: '22222222-2222-4222-8222-222222222221',
    saudiArabia: '22222222-2222-4222-8222-222222222222',
    uae: '22222222-2222-4222-8222-222222222223',
    kuwait: '22222222-2222-4222-8222-222222222224',
    qatar: '22222222-2222-4222-8222-222222222225',
  },
  languages: {
    arabic: '33333333-3333-4333-8333-333333333331',
    english: '33333333-3333-4333-8333-333333333332',
  },
  specialtyCategories: {
    mentalHealth: '34333333-3333-4333-8333-333333333341',
    nutrition: '34333333-3333-4333-8333-333333333342',
    fitness: '34333333-3333-4333-8333-333333333343',
  },
  specialties: {
    anxiety: '44444444-4444-4444-8444-444444444441',
    depression: '44444444-4444-4444-8444-444444444442',
    nutrition: '44444444-4444-4444-8444-444444444443',
    familyCounseling: '44444444-4444-4444-8444-444444444444',
    childPsychology: '44444444-4444-4444-8444-444444444445',
    emotionalEating: '44444444-4444-4444-8444-444444444446',
    weightManagement: '44444444-4444-4444-8444-444444444447',
    sportsInjuryRehab: '44444444-4444-4444-8444-444444444448',
    athleticPerformance: '44444444-4444-4444-8444-444444444449',
  },
  patientProfiles: {
    patientA: '55555555-5555-4555-8555-555555555551',
    patientB: '55555555-5555-4555-8555-555555555552',
  },
  practitionerProfiles: {
    practitionerA: '66666666-6666-4666-8666-666666666661',
    practitionerB: '66666666-6666-4666-8666-666666666662',
    practitionerC: '66666666-6666-4666-8666-666666666663',
    practitionerD: '66666666-6666-4666-8666-666666666664',
    practitionerE: '66666666-6666-4666-8666-666666666665',
    practitionerF: '66666666-6666-4666-8666-666666666666',
    practitionerG: '66666666-6666-4666-8666-666666666667',
    practitionerH: '66666666-6666-4666-8666-666666666668',
    practitionerI: '66666666-6666-4666-8666-666666666669',
    practitionerJ: '66666666-6666-4666-8666-666666666670',
  },
  practitionerApplications: {
    practitionerA: '77777777-7777-4777-8777-777777777771',
    practitionerB: '77777777-7777-4777-8777-777777777772',
    practitionerC: '77777777-7777-4777-8777-777777777773',
    practitionerD: '77777777-7777-4777-8777-777777777774',
    practitionerE: '77777777-7777-4777-8777-777777777775',
    practitionerF: '77777777-7777-4777-8777-777777777776',
    practitionerG: '77777777-7777-4777-8777-777777777777',
    practitionerH: '77777777-7777-4777-8777-777777777778',
    practitionerI: '77777777-7777-4777-8777-777777777779',
    practitionerJ: '77777777-7777-4777-8777-777777777780',
  },
  credentials: {
    aLicense: '88888888-8888-4888-8888-888888888881',
    aDegree: '88888888-8888-4888-8888-888888888882',
    bLicense: '88888888-8888-4888-8888-888888888883',
    cLicense: '88888888-8888-4888-8888-888888888884',
    dLicense: '88888888-8888-4888-8888-888888888885',
    eLicense: '88888888-8888-4888-8888-888888888886',
    fLicense: '88888888-8888-4888-8888-888888888887',
    gLicense: '88888888-8888-4888-8888-888888888888',
    hLicense: '88888888-8888-4888-8888-888888888889',
    iLicense: '88888888-8888-4888-8888-888888888890',
    jLicense: '88888888-8888-4888-8888-888888888891',
  },
  sessions: {
    adminSession: '99999999-9999-4999-8999-999999999991',
    patientSession: '99999999-9999-4999-8999-999999999992',
  },
} as const;

export const seedCredentials = {
  superAdmin: {
    email: 'admin@hesba.local',
    password: 'Admin@12345',
  },
  support: {
    email: 'support@hesba.local',
    password: 'Support@12345',
  },
  reviewer: {
    email: 'reviewer@hesba.local',
    password: 'Reviewer@12345',
  },
  patientA: {
    email: 'ahmed.patient@hesba.local',
    password: 'Patient@12345',
  },
  patientB: {
    email: 'mohamed.patient@hesba.local',
    password: 'Patient2@12345',
    googleSubject: 'google-patient-two-001',
  },
  practitionerA: {
    email: 'dr.ahmed@hesba.local',
    password: 'Practitioner@12345',
  },
  practitionerB: {
    email: 'dr.mohamed@hesba.local',
    password: 'Practitioner2@12345',
  },
  practitionerC: {
    email: 'dr.mahmoud@hesba.local',
    password: 'Practitioner3@12345',
  },
  practitionerD: {
    email: 'dr.abdelfattah@hesba.local',
    password: 'Practitioner4@12345',
  },
  practitionerE: {
    email: 'dr.youssef@hesba.local',
    password: 'Practitioner5@12345',
  },
  practitionerF: {
    email: 'dr.karim@hesba.local',
    password: 'Practitioner6@12345',
  },
  practitionerG: {
    email: 'dr.sara@hesba.local',
    password: 'Practitioner7@12345',
  },
  practitionerH: {
    email: 'dr.nour@hesba.local',
    password: 'Practitioner8@12345',
  },
  practitionerI: {
    email: 'dr.mariam@hesba.local',
    password: 'Practitioner9@12345',
  },
  practitionerJ: {
    email: 'dr.hassan@hesba.local',
    password: 'Practitioner10@12345',
  },
} as const;
