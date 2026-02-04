const csvInput = document.getElementById("csvInput");
const loadSampleButton = document.getElementById("loadSample");
const expensesBody = document.getElementById("expensesBody");
const totalAmount = document.getElementById("totalAmount");
const totalCount = document.getElementById("totalCount");
const categorySummary = document.getElementById("categorySummary");
const ruleForm = document.getElementById("ruleForm");
const ruleName = document.getElementById("ruleName");
const ruleKeywords = document.getElementById("ruleKeywords");
const rulesList = document.getElementById("rulesList");
const ruleTemplate = document.getElementById("ruleTemplate");

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

let expenses = [];
let rules = [
  { name: "Alimentação", keywords: ["restaurante", "lanche", "mercado"] },
  { name: "Transporte", keywords: ["uber", "combustivel", "metrô", "metro"] },
  { name: "Lazer", keywords: ["cinema", "show", "viagem"] },
];

const sampleCsv = `data,valor,id,descricao
2024-01-05,35.5,101,Restaurante da esquina
2024-01-06,120.00,102,Supermercado semanal
2024-01-10,18,103,Uber para o trabalho
2024-01-12,75,104,Cinema com amigos
2024-01-15,210,105,Combustivel carro`;

const normalizeText = (text) => text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

const parseDate = (value) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.includes("/")) {
    const [day, month, year] = trimmed.split("/");
    if (day && month && year) {
      return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  return trimmed;
};

const parseAmount = (value) => {
  if (!value) return 0;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const amount = Number.parseFloat(normalized);
  return Number.isNaN(amount) ? 0 : amount;
};

const parseCsv = (text) => {
  const rows = [];
  let current = "";
  let inQuotes = false;
  const pushValue = (row) => {
    row.push(current);
    current = "";
  };
  let row = [];

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      pushValue(row);
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      pushValue(row);
      rows.push(row);
      row = [];
      continue;
    }
    current += char;
  }
  pushValue(row);
  if (row.length > 1 || row[0]) {
    rows.push(row);
  }
  return rows;
};

const buildExpenses = (rows) => {
  const [header, ...data] = rows;
  if (!header) return [];
  const headers = header.map((item) => normalizeText(item.trim()));
  const indexMap = {
    data: headers.indexOf("data"),
    valor: headers.indexOf("valor"),
    id: headers.indexOf("id"),
    descricao: headers.indexOf("descricao") !== -1 ? headers.indexOf("descricao") : headers.indexOf("descrição"),
  };

  return data
    .filter((row) => row.some((value) => value.trim()))
    .map((row) => {
      const descricao = row[indexMap.descricao] || "";
      return {
        data: parseDate(row[indexMap.data] || ""),
        valor: parseAmount(row[indexMap.valor] || "0"),
        id: row[indexMap.id] || "",
        descricao,
        categoria: matchCategory(descricao),
      };
    });
};

const matchCategory = (descricao) => {
  const normalized = normalizeText(descricao);
  const rule = rules.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(normalizeText(keyword)))
  );
  return rule ? rule.name : "Sem categoria";
};

const renderRules = () => {
  rulesList.innerHTML = "";
  rules.forEach((rule, index) => {
    const content = ruleTemplate.content.cloneNode(true);
    const title = content.querySelector(".rule-title");
    const keywords = content.querySelector(".rule-keywords");
    const removeButton = content.querySelector(".remove-rule");
    title.textContent = rule.name;
    keywords.textContent = `Palavras-chave: ${rule.keywords.join(", ")}`;
    removeButton.addEventListener("click", () => {
      rules.splice(index, 1);
      refreshCategories();
    });
    rulesList.appendChild(content);
  });
};

const renderExpenses = () => {
  expensesBody.innerHTML = "";
  expenses.forEach((expense) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${expense.data}</td>
      <td>${currencyFormatter.format(expense.valor)}</td>
      <td>${expense.id}</td>
      <td>${expense.descricao}</td>
      <td>${expense.categoria}</td>
    `;
    expensesBody.appendChild(row);
  });
};

const renderSummary = () => {
  const total = expenses.reduce((sum, item) => sum + item.valor, 0);
  totalAmount.textContent = currencyFormatter.format(total);
  totalCount.textContent = expenses.length.toString();

  const grouped = expenses.reduce((acc, item) => {
    acc[item.categoria] = (acc[item.categoria] || 0) + item.valor;
    return acc;
  }, {});

  categorySummary.innerHTML = "";
  Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .forEach(([categoria, valor]) => {
      const card = document.createElement("div");
      card.className = "category-card";
      card.innerHTML = `<span>${categoria}</span><strong>${currencyFormatter.format(valor)}</strong>`;
      categorySummary.appendChild(card);
    });
};

const refreshCategories = () => {
  expenses = expenses.map((expense) => ({
    ...expense,
    categoria: matchCategory(expense.descricao),
  }));
  renderRules();
  renderExpenses();
  renderSummary();
};

const handleCsvText = (text) => {
  const rows = parseCsv(text.trim());
  if (!rows.length) return;
  expenses = buildExpenses(rows);
  refreshCategories();
};

csvInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    handleCsvText(loadEvent.target.result);
  };
  reader.readAsText(file);
});

loadSampleButton.addEventListener("click", () => {
  handleCsvText(sampleCsv);
});

ruleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = ruleName.value.trim();
  const keywords = ruleKeywords.value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  if (!name || !keywords.length) return;
  rules.push({ name, keywords });
  ruleName.value = "";
  ruleKeywords.value = "";
  refreshCategories();
});

renderRules();
