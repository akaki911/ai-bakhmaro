'use strict';

function buildResponse(message, telemetry = {}) {
  return {
    response: message,
    metadata: {
      telemetry,
    },
  };
}

function formatChecklist(items = []) {
  return items.map((item) => `• ${item}`).join('\n');
}

function buildGreetingResponse() {
  return buildResponse(
    'გამარჯობა! მე ვარ Gurulo — ai.bakhmaro.co-ს AI დეველოპერული ასისტენტი. მზად ვარ დაგეხმარო კოდის ანალიზში, ავტომატიზაციაში და პლატფორმის მონიტორინგში.'
  );
}

function buildSmalltalkResponse() {
  return buildResponse('ყველაფერი კარგია! ვმუშაობ Gurulo-ს დეველოპერულ გარემოში. რა ტექნიკური საკითხი გაინტერესებს?');
}

function buildParamRequestResponse() {
  const checklist = formatChecklist([
    'მომაწოდე ფაილის ან სერვისის ზუსტი გზა',
    'დამიწერე რა ცვლილებაა საჭირო',
    'საჭიროების შემთხვევაში მიუთითე დაკავშირებული ლოგები ან შეცდომები',
  ]);
  return buildResponse(`დავიწყოთ! ეფექტური პასუხისთვის მჭირდება დამატებითი დეტალები:\n${checklist}`);
}

function buildAvailabilityResults() {
  const status = formatChecklist([
    'Automation queue — online',
    'Trusted Ops — მზად არის ცვლილებების გასაშვებად',
    'Monitoring dashboards — მონაცემები实时 რეჟიმშია',
  ]);
  return buildResponse(`🛠️ **Automation Readiness**\n${status}`);
}

function buildPricingInfoResponse() {
  const info = formatChecklist([
    'AI compute usage კონტროლდება Groq metrics-ით',
    'OpenAI fallback მხოლოდ საჭიროების შემთხვევაში ერთვება',
    'Workspace scripts იყენებს pnpm-ს და გაზიარებულ cache-ს',
  ]);
  return buildResponse(`📊 **Resource & Cost Overview**\n${info}`);
}

function buildWeatherInfoResponse() {
  return buildResponse('პლატფორმა არ აკვირდება ამინდს — მე აქ ვარ მხოლოდ დეველოპერული ამოცანებისთვის. შევხედოთ კოდის ან მონიტორინგის მონაცემებს.');
}

function buildTripPlanResponse() {
  const steps = formatChecklist([
    'გაანალიზე რა კომპონენტს ან სერვისს ეხება ამოცანა',
    'გამოიძახე შესაბამისი სერვისები — მაგალითად repository_automation_service ან system_watchdog',
    'გაგზავნე ცვლილება Trusted Ops-ის მეშვეობით და გადაამოწმე ლოგები',
  ]);
  return buildResponse(`🗺️ **სამუშაო გეგმა**\n${steps}`);
}

function buildPoliciesFaqResponse() {
  const policies = formatChecklist([
    'Trusted Ops ასრულებს ცვლილებებს მხოლოდ უსაფრთხო წესებით',
    'ყველა ავტომატური მოქმედება ლოგირდება და შეიძლება გაუქმდეს',
    'AI ასისტენტი მხოლოდ დეველოპერულ კონტექსტს ამუშავებს და არ აკონტროლებს გარე მომხმარებლების მონაცემებს',
  ]);
  return buildResponse(`📘 **Workspace Policies**\n${policies}`);
}

function buildContactSupportResponse() {
  return buildResponse('თუ დამატებითი მხარდაჭერა გჭირდება, გამოიყენე #dev-ai არხი ან გახსენი issue shared/gurulo-core პროცესით. აქვე შემიძლია დაგეხმარო პირველადი დიაგნოსტიკით.');
}

function buildTransportResponse() {
  return buildResponse('ტრანსპორტირების თემები აღარ არის აქტუალური. გადავინაცვლოთ კოდის, ავტომატიზაციის ან მონიტორინგის საკითხებზე.');
}

function buildLocalAttractionsResponse() {
  return buildResponse('ახლა ვფოკუსირდებით მხოლოდ დეველოპერულ გარემოზე. შემიძლია გაგიზიარო რეეპოს სტრუქტურა, სერვისების სტატუსი და ავტომატიზაციის შესაძლებლობები.');
}

function buildLegacyFeatureResponse() {
  return buildResponse('ეს ფუნქცია პლატფორმიდან ამოღებულია. მოდი გადავხედოთ კოდის ფაილებს, ავტომატიზაციას ან მონიტორინგის შედეგებს.');
}

function buildOffTopicResponse() {
  const reminder = formatChecklist([
    'Gurulo მუშაობს როგორც დეველოპერული ასისტენტი',
    'შემიძლია გაგიზიარო რეპოზიტორიის სტრუქტურა და ავტომატიზაციის მდგომარეობა',
    'არ ვფარავ ტურისტულ ან საცხოვრებელ თემებს',
  ]);
  return buildResponse(`🙌 შევინარჩუნოთ საუბარი დეველოპერულ საკითხებზე:\n${reminder}`, {
    blocked_off_topic: true,
  });
}

module.exports = {
  buildGreetingResponse,
  buildSmalltalkResponse,
  buildParamRequestResponse,
  buildAvailabilityResults,
  buildPricingInfoResponse,
  buildWeatherInfoResponse,
  buildTripPlanResponse,
  buildPoliciesFaqResponse,
  buildContactSupportResponse,
  buildTransportResponse,
  buildLocalAttractionsResponse,
  buildLegacyFeatureResponse,
  buildOffTopicResponse,
};
