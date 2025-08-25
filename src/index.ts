#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import minimist from "minimist";
import prompts, { PromptObject } from "prompts";
import colors from "picocolors";
import ora from "ora";
import boxen from "boxen";
import figures from "figures";

const {
  red,
  green,
  greenBright,
  blue,
  blueBright,
  cyan,
  yellow,
  magenta,
  reset,
  bold,
} = colors;

// Type definitions
type ColorFunc = (str: string | number) => string;

type Option = {
  id: string;
  display: string;
  choices: { name: string; color: ColorFunc }[];
};

type Template = {
  id: string;
  requirements: Record<string, string>;
  color: ColorFunc;
};

type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

// Configuration object that defines all possible options
const OPTIONS: Option[] = [
  {
    id: "projectType",
    display: "Project Type",
    choices: [
      { name: "API Only", color: blue },
      { name: "Full Stack", color: green },
    ],
  },
  {
    id: "server",
    display: "Server Framework",
    choices: [
      { name: "Express", color: blue },
      { name: "Hono", color: yellow },
    ],
  },
  {
    id: "database",
    display: "Database",
    choices: [
      { name: "PostgreSQL", color: blue },
      { name: "MongoDB", color: green },
      { name: "MySQL", color: magenta },
      { name: "SQLite", color: cyan },
    ],
  },
  {
    id: "language",
    display: "Language",
    choices: [
      { name: "JavaScript", color: yellow },
      { name: "TypeScript", color: blue },
    ],
  },
  {
    id: "frontend",
    display: "Frontend Framework",
    choices: [
      { name: "Vite", color: yellow },
      { name: "Next.js", color: blue },
    ],
  },
];

// Technology name mappings for inferring requirements from template ids
const TECH_MAPPINGS: Record<
  string,
  { type: string; value: string; weight?: number }
> = {
  api: { type: "projectType", value: "API Only", weight: 1 },
  fullstack: { type: "projectType", value: "Full Stack", weight: 1 },
  pg: { type: "database", value: "PostgreSQL", weight: 1 },
  mongo: { type: "database", value: "MongoDB", weight: 1 },
  mysql: { type: "database", value: "MySQL", weight: 1 },
  sqlite: { type: "database", value: "SQLite", weight: 1 },
  ts: { type: "language", value: "TypeScript", weight: 2 },
  hono: { type: "server", value: "Hono", weight: 1 },
  express: { type: "server", value: "Express", weight: 1 },
  vite: { type: "frontend", value: "Vite", weight: 1 },
  next: { type: "frontend", value: "Next.js", weight: 1 },
};

// Default color mappings for templates based on their primary technology
const COLOR_MAPPINGS: Record<string, ColorFunc> = {
  "API Only": blue,
  "Full Stack": green,
  PostgreSQL: blue,
  MongoDB: green,
  MySQL: magenta,
  SQLite: cyan,
  Hono: yellow,
  TypeScript: blue,
  JavaScript: yellow,
  Express: blue,
  Vite: yellow,
  "Next.js": blue,
};

// Function to dynamically discover available templates
function discoverTemplates(): Template[] {
  const templates: Template[] = [];
  const templateDirPath = path.resolve(
    fileURLToPath(import.meta.url),
    "../../"
  );

  try {
    const dirEntries = fs.readdirSync(templateDirPath, { withFileTypes: true });
    const templateDirs = dirEntries.filter(
      (dirent) => dirent.isDirectory() && dirent.name.startsWith("template-")
    );

    console.log(`Found ${templateDirs.length} potential template directories`);

    for (const templateDir of templateDirs) {
      const templateId = templateDir.name.replace("template-", "");
      const requirements = inferRequirementsFromId(templateId);

      // Skip if we couldn't infer all required options
      // For backward compatibility, API templates without projectType should still work
      const hasAllRequiredOptions = OPTIONS.every((option) => {
        if (option.id === "projectType") {
          // If projectType is missing, it's an old API template
          return (
            requirements[option.id] !== undefined ||
            templateId.startsWith("api-")
          );
        }
        if (option.id === "frontend") {
          // Frontend is only required for full stack projects
          return (
            requirements[option.id] !== undefined ||
            requirements.projectType !== "Full Stack"
          );
        }
        return requirements[option.id] !== undefined;
      });

      if (!hasAllRequiredOptions) {
        console.warn(
          `Skipping template ${templateId} as it's missing some required options`
        );
        continue;
      }

      // Determine color based on primary technology
      const primaryTech = requirements.database || requirements.server;
      const color =
        COLOR_MAPPINGS[primaryTech] ||
        (requirements.language === "TypeScript" ? blue : yellow);

      templates.push({
        id: templateId,
        requirements,
        color,
      });
    }

    console.log(`Successfully loaded ${templates.length} templates`);
    return templates;
  } catch (error) {
    console.error(`Error discovering templates: ${error}`);
    // Return empty array if there's an error
    return [];
  }
}

// Function to infer template requirements from its ID
export function inferRequirementsFromId(
  templateId: string
): Record<string, string> {
  const requirements: Record<string, string> = {};
  const parts = templateId.split("-");

  // Process each part of the template ID
  for (const part of parts) {
    if (TECH_MAPPINGS[part]) {
      const { type, value } = TECH_MAPPINGS[part];
      requirements[type] = value;
    }
  }

  // Default to API Only if no project type is specified
  if (!requirements.projectType) {
    requirements.projectType = "API Only";
  }

  // Default to Express if no server framework is specified
  if (!requirements.server) {
    requirements.server = "Express";
  }

  // Default to JavaScript if no language is specified
  if (!requirements.language) {
    requirements.language = "JavaScript";
  }

  // Default to Vite if no frontend framework is specified for full stack projects
  if (requirements.projectType === "Full Stack" && !requirements.frontend) {
    requirements.frontend = "Vite";
  }

  return requirements;
}

// Discover templates dynamically
const TEMPLATES = discoverTemplates();

// If no templates were found, provide some fallback templates for development
if (TEMPLATES.length === 0) {
  console.warn("No templates discovered, using fallback templates");

  // Default template definitions (fallback)
  [
    {
      id: "api-pg-ts",
      requirements: {
        projectType: "API Only",
        server: "Express",
        database: "PostgreSQL",
        language: "TypeScript",
      },
      color: blue,
    },
    {
      id: "api-pg",
      requirements: {
        projectType: "API Only",
        server: "Express",
        database: "PostgreSQL",
        language: "JavaScript",
      },
      color: blueBright,
    },
    // Add your default templates here as fallback
  ].forEach((template) => TEMPLATES.push(template));
}

// Default target directory
const defaultTargetDir = "tibbs-stack";
const renameFiles: Record<string, string | undefined> = {
  _gitignore: ".gitignore",
};

function displayTemplateMatrix() {
  // Create headers for the table
  const headers = `${"Type".padEnd(12)}${"Server".padEnd(
    12
  )}${"Database".padEnd(12)}${"Language".padEnd(12)}${"Frontend".padEnd(
    12
  )}${"Template".padEnd(15)}`;
  const separator = "-".repeat(80);

  // Build table rows for each template
  const rows = TEMPLATES.map(
    (t) =>
      `${cyan(t.requirements.projectType.padEnd(12))}${blue(
        t.requirements.server.padEnd(12)
      )}${green(t.requirements.database.padEnd(12))}${yellow(
        t.requirements.language.padEnd(12)
      )}${magenta((t.requirements.frontend || "N/A").padEnd(12))}${t.color(
        t.id.padEnd(15)
      )}`
  ).join("\n");

  // Display in a box
  console.log(
    boxen(
      `${bold(
        "Available Templates"
      )}\n${separator}\n${headers}\n${separator}\n${rows}`,
      { padding: 1, borderColor: "white", borderStyle: "round" }
    )
  );
}

function showStep(step: number, totalSteps: number, description: string) {
  console.log(
    `\n${green(figures.pointer)} ${green(`Step ${step}/${totalSteps}:`)} ${bold(
      description
    )}\n`
  );
}

// Helper function to find matching template based on selections
function findMatchingTemplate(
  selections: Record<string, string>
): Template | undefined {
  // Log the selections for debugging
  console.log(
    "Matching template for selections:",
    JSON.stringify(selections, null, 2)
  );

  // Filter out undefined or null values
  const cleanSelections: Record<string, string> = {};
  Object.entries(selections).forEach(([key, value]) => {
    if (value && OPTIONS.some((opt) => opt.id === key)) {
      cleanSelections[key] = value;
    }
  });

  // Check if we have all required selections
  const hasAllRequiredSelections = OPTIONS.every((option) => {
    // Frontend is only required for full stack projects
    if (option.id === "frontend") {
      return cleanSelections.projectType === "Full Stack"
        ? cleanSelections[option.id] !== undefined
        : true; // Skip validation for API-only projects
    }
    return cleanSelections[option.id] !== undefined;
  });

  if (!hasAllRequiredSelections) {
    console.log(red("Missing required selections"));
    return undefined;
  }

  return TEMPLATES.find((template) => {
    return Object.entries(template.requirements).every(
      ([key, value]) => cleanSelections[key] === value
    );
  });
}

// Helper function to validate a template
function validateTemplate(template: Template): ValidationResult {
  const errors: string[] = [];
  if (!template.id) errors.push("Template ID is required");
  if (!template.requirements) errors.push("Template requirements are required");

  OPTIONS.forEach((option) => {
    if (!template.requirements[option.id]) {
      // Frontend is only required for full stack projects
      if (
        option.id === "frontend" &&
        template.requirements.projectType !== "Full Stack"
      ) {
        return; // Skip validation for frontend on API-only projects
      }
      // Project type is required for all templates
      if (option.id === "projectType") {
        errors.push(`Missing requirements for ${option.id}`);
      }
      // Other options are required
      else if (option.id !== "frontend") {
        errors.push(`Missing requirements for ${option.id}`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Validate all templates
TEMPLATES.forEach((template) => {
  const validResult = validateTemplate(template);
  if (!validResult.isValid) {
    console.warn(
      `Template ${template.id} has validation errors:`,
      validResult.errors
    );
  }
});

// Parse command line arguments
const argv = minimist<{
  template?: string;
  help?: boolean;
}>(process.argv.slice(2), {
  default: { help: false },
  alias: { h: "help", t: "template" },
  string: ["_"],
});

// Generate help message dynamically based on available options
function generateHelpMessage(): string {
  const templateList = TEMPLATES.map((t) => `${t.color(t.id.padEnd(20))}`).join(
    "\n"
  );

  return `Usage: create-tibbs-stack [options] [project-name]

Create a new full stack project with your chosen configuration.
With no arguments, start the CLI in interactive mode.

Options:
  -t, --template NAME        Use a specific template
  -h, --help                 Display this help message

Available templates:
${templateList}`;
}

// Check Node.js version
async function checkNodeVersion(
  requiredVersion: string = "14.0.0"
): Promise<boolean> {
  const currentVersion = process.versions.node;
  const semver = currentVersion.split(".").map(Number);
  const required = requiredVersion.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    if (semver[i] > required[i]) return true;
    if (semver[i] < required[i]) return false;
  }
  return true;
}

// Helper function to determine package manager command
function getPackageManagerCommand(userAgent: string | undefined) {
  const pkgInfo = pkgFromUserAgent(userAgent);
  const pkgManager = pkgInfo ? pkgInfo.name : "npm";

  switch (pkgManager) {
    case "yarn":
      return "yarn";
    case "pnpm":
      return "pnpm install";
    default:
      return "npm install";
  }
}

// Helper function to get frontend creation command
function getFrontendCreationCommand(
  frontend: string,
  language: string,
  tailwind: boolean = false
): string {
  const isTypeScript = language === "TypeScript";

  switch (frontend) {
    case "Vite":
      return `npm create vite@latest client -- --template ${
        isTypeScript ? "react-ts" : "react"
      }`;
    case "Next.js":
      return `npx create-next-app@latest client --typescript=${isTypeScript} --tailwind=${tailwind} --eslint=true --app --src-dir=false --import-alias="@/*" --yes`;
    default:
      throw new Error(`Unsupported frontend framework: ${frontend}`);
  }
}

// Helper function to create frontend
async function createFrontend(
  frontend: string,
  language: string,
  projectRoot: string,
  tailwind: boolean = false
) {
  const spinner = ora(`Creating ${frontend} frontend...`).start();

  try {
    const command = getFrontendCreationCommand(frontend, language, tailwind);
    const { execSync } = await import("child_process");

    // Change to project directory and run the command
    execSync(command, {
      cwd: projectRoot,
      stdio: "pipe",
      encoding: "utf8",
    });

    spinner.succeed(`${frontend} frontend created successfully!`);
  } catch (error: any) {
    spinner.fail(`Failed to create ${frontend} frontend: ${error.message}`);
    throw error;
  }
}

// Main function to initialise the project
async function init() {
  const argTargetDir = formatTargetDir(argv._[0]);
  const argTemplate = argv.template || argv.t;

  if (!(await checkNodeVersion())) {
    console.error(red("✖ Node.js 14.0.0 or higher is required"));
    process.exit(1);
  }

  if (argv.help) {
    console.log(generateHelpMessage());
    // Add template matrix display for better help visualization
    displayTemplateMatrix();
    return;
  }

  // Show welcome message with a nice box
  console.log(
    boxen(bold(greenBright("Tibbs Stack Generator")), {
      padding: 1,
      margin: 1,
      borderColor: "green",
      borderStyle: "double",
    })
  );

  // Early validation of template argument
  if (argTemplate) {
    const templateExists = TEMPLATES.some((t) => t.id === argTemplate);
    if (!templateExists) {
      console.error(red(`Template "${argTemplate}" not found.`));
      console.log("Available templates:");
      TEMPLATES.forEach((t) => console.log(`  ${t.color(t.id)}`));
      process.exit(1);
    }
  }

  let targetDir = argTargetDir || defaultTargetDir;
  const getProjectName = () => path.basename(path.resolve(targetDir));

  try {
    // Break down the prompts into two phases for better flow control
    let result: any = {};

    // First phase: Get selection mode
    showStep(1, 4, "Project configuration");

    // Only ask for selection mode if no template is specified via arguments
    let selectionMode = argTemplate ? "template" : "custom"; // default
    if (!argTemplate) {
      const modeResult = await prompts(
        {
          type: "select",
          name: "selectionMode",
          message: reset("How would you like to configure your project?"),
          choices: [
            {
              title: `${greenBright(
                figures.radioOn
              )} Choose individual components`,
              value: "custom",
            },
            {
              title: `${blueBright(
                figures.radioOn
              )} Select from available templates`,
              value: "template",
            },
          ],
        },
        {
          onCancel: () => {
            throw new Error(red("✖") + " Operation cancelled");
          },
        }
      );

      selectionMode = modeResult.selectionMode;
    }
    result.selectionMode = selectionMode;
    result.templateChoice = argTemplate; // Set template choice from command line argument if provided

    // Get template choice if template mode is selected and no template argument was provided
    if (selectionMode === "template" && !argTemplate) {
      const templateResult = await prompts(
        {
          type: "select",
          name: "templateChoice",
          message: reset("Select a template:"),
          choices: TEMPLATES.map((t) => ({
            title: `${t.color(t.id)} (${t.requirements.projectType} + ${
              t.requirements.server
            } + ${t.requirements.database} + ${t.requirements.language}${
              t.requirements.frontend ? ` + ${t.requirements.frontend}` : ""
            })`,
            value: t.id,
          })),
        },
        {
          onCancel: () => {
            throw new Error(red("✖") + " Operation cancelled");
          },
        }
      );

      result.templateChoice = templateResult.templateChoice;
    }

    // Get project name and handle directory
    if (!argTargetDir) {
      const projectResult = await prompts(
        {
          type: "text",
          name: "projectName",
          message: reset("Project name:"),
          initial: defaultTargetDir,
          onState: (state: any) => {
            targetDir = formatTargetDir(state.value) || defaultTargetDir;
          },
        },
        {
          onCancel: () => {
            throw new Error(red("✖") + " Operation cancelled");
          },
        }
      );

      result.projectName = projectResult.projectName;
    }

    // Handle directory overwrite if needed
    if (fs.existsSync(targetDir) && !isEmpty(targetDir)) {
      const overwriteResult = await prompts(
        {
          type: "select",
          name: "overwrite",
          message: `${
            targetDir === "."
              ? "Current directory"
              : `Target directory "${targetDir}"`
          } is not empty. Please choose how to proceed:`,
          choices: [
            { title: "Cancel operation", value: "no" },
            { title: "Remove existing files and continue", value: "yes" },
            { title: "Ignore files and continue", value: "ignore" },
          ],
        },
        {
          onCancel: () => {
            throw new Error(red("✖") + " Operation cancelled");
          },
        }
      );

      result.overwrite = overwriteResult.overwrite;
      if (result.overwrite === "no") {
        throw new Error(red("✖") + " Operation cancelled");
      }
    }

    // Check package name validity
    if (!isValidPackageName(getProjectName())) {
      const packageResult = await prompts(
        {
          type: "text",
          name: "packageName",
          message: reset("Package name:"),
          initial: toValidPackageName(getProjectName()),
          validate: (dir: string) =>
            isValidPackageName(dir) || "Invalid package.json name",
        },
        {
          onCancel: () => {
            throw new Error(red("✖") + " Operation cancelled");
          },
        }
      );

      result.packageName = packageResult.packageName;
    }

    // Second phase: Component selection (only if custom mode is selected)
    if (result.selectionMode === "custom") {
      showStep(2, 4, "Component Selection");

      // First, ask for all options except frontend
      const nonFrontendOptions = OPTIONS.filter(
        (option) => option.id !== "frontend"
      );
      const componentPrompts: PromptObject[] = nonFrontendOptions.map(
        (option) => ({
          type: "select" as const,
          name: option.id,
          message: reset(`Select ${option.display}:`),
          choices: option.choices.map((choice) => ({
            title: `${choice.color(figures.radioOn)} ${choice.color(
              choice.name
            )}`,
            value: choice.name,
          })),
          hint: "(Use arrow keys and Enter to select)",
        })
      );

      const componentSelections = await prompts(componentPrompts, {
        onCancel: () => {
          throw new Error(red("✖") + " Operation cancelled");
        },
      });

      Object.assign(result, componentSelections);

      // Then, conditionally ask for frontend framework only if project type is Full Stack
      if (result.projectType === "Full Stack") {
        const frontendOption = OPTIONS.find(
          (option) => option.id === "frontend"
        );
        if (frontendOption) {
          const frontendPrompt: PromptObject = {
            type: "select" as const,
            name: "frontend",
            message: reset(`Select ${frontendOption.display}:`),
            choices: frontendOption.choices.map((choice) => ({
              title: `${choice.color(figures.radioOn)} ${choice.color(
                choice.name
              )}`,
              value: choice.name,
            })),
            hint: "(Use arrow keys and Enter to select)",
          };

          const frontendSelection = await prompts([frontendPrompt], {
            onCancel: () => {
              throw new Error(red("✖") + " Operation cancelled");
            },
          });

          Object.assign(result, frontendSelection);
        }
      }
    }

    const { overwrite, packageName } = result;

    showStep(3, 4, "Preparing project structure");

    // If template was provided via argument, use it directly
    // Otherwise, find matching template based on user selections or direct template choice
    const template = argTemplate
      ? TEMPLATES.find((t) => t.id === argTemplate)
      : result.selectionMode === "template" && result.templateChoice
      ? TEMPLATES.find((t) => t.id === result.templateChoice)
      : result.selectionMode === "custom"
      ? findMatchingTemplate({
          projectType: result.projectType,
          server: result.server,
          database: result.database,
          language: result.language,
          frontend: result.frontend,
        })
      : null;

    if (!template) {
      console.log("\n");
      if (result.selectionMode === "custom") {
        console.error(red("No matching template found for your selections."));
        console.log("Available combinations:");
        displayTemplateMatrix();
      } else if (result.selectionMode === "template") {
        console.error(red("No valid template was selected."));
        console.log("Available templates:");
        TEMPLATES.forEach((t) => console.log(`  ${t.color(t.id)}`));
      } else {
        console.error(
          red("No matching template found for the selected configuration")
        );
      }
      process.exit(1);
    }

    // Add Tailwind preference step for Next.js projects
    if (template.requirements.frontend === "Next.js") {
      showStep(3.25, 4, "Next.js Configuration");

      const tailwindResult = await prompts(
        {
          type: "select",
          name: "tailwind",
          message: reset("Would you like to include Tailwind CSS?"),
          choices: [
            {
              title: `${green(figures.radioOn)} Yes, include Tailwind CSS`,
              value: true,
            },
            {
              title: `${blue(figures.radioOn)} No, skip Tailwind CSS`,
              value: false,
            },
          ],
        },
        {
          onCancel: () => {
            throw new Error(red("✖") + " Operation cancelled");
          },
        }
      );

      result.tailwind = tailwindResult.tailwind;
    }

    // Show configuration summary with a nice boxed display
    const tailwindInfo =
      template.requirements.frontend === "Next.js" &&
      result.tailwind !== undefined
        ? `\n${magenta(figures.bullet)} Tailwind CSS: ${
            result.tailwind ? "Yes" : "No"
          }`
        : "";

    console.log(
      "\n" +
        boxen(
          `${bold("Your selections:")}\n
${cyan(figures.bullet)} Project Type: ${template.requirements.projectType}
${blue(figures.bullet)} Server: ${template.requirements.server}
${green(figures.bullet)} Database: ${template.requirements.database}
${yellow(figures.bullet)} Language: ${template.requirements.language}${
            template.requirements.frontend
              ? `\n${magenta(figures.bullet)} Frontend: ${
                  template.requirements.frontend
                }`
              : ""
          }${tailwindInfo}

${bold("Template:")} ${template.color(template.id)}`,
          { padding: 1, margin: 1, borderStyle: "round", borderColor: "cyan" }
        )
    );

    // Add a confirmation step for better UX
    const confirmation = await prompts({
      type: "confirm",
      name: "proceed",
      message: "Proceed with this configuration?",
      initial: true,
    });

    if (!confirmation.proceed) {
      throw new Error(red("✖") + " Operation cancelled");
    }

    // Project scaffolding part
    const root = path.join(process.cwd(), targetDir);

    if (overwrite === "yes") {
      emptyDir(root);
    } else if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }

    // Update template resolution to check for template directory at multiple locations
    let templateDir = "";
    const possibleTemplatePaths = [
      // Current working directory
      path.resolve(process.cwd(), `template-${template.id}`),
      // Sibling directory to src
      path.resolve(
        fileURLToPath(import.meta.url),
        "../../",
        `template-${template.id}`
      ),
      // Parent directory of script
      path.resolve(
        fileURLToPath(import.meta.url),
        "../../../",
        `template-${template.id}`
      ),
    ];

    for (const possiblePath of possibleTemplatePaths) {
      if (fs.existsSync(possiblePath)) {
        templateDir = possiblePath;
        break;
      }
    }

    if (!templateDir) {
      throw new Error(
        `Template ${template.id} not found in any of the expected locations.`
      );
    }

    showStep(3.5, 4, "Creating project files");

    // Start a spinner for file operations
    const spinner = ora(`Creating project in ${blue(root)}`).start();

    // Copy template files
    const write = (file: string, content?: string) => {
      try {
        const targetPath = path.join(root, renameFiles[file] ?? file);
        if (content) {
          fs.writeFileSync(targetPath, content);
        } else {
          copy(path.join(templateDir, file), targetPath);
        }
      } catch (error: any) {
        spinner.fail(`Failed to write ${file}: ${error.message}`);
        throw error;
      }
    };

    const files = fs.readdirSync(templateDir);

    // For full stack projects, copy the entire template structure
    if (template.requirements.projectType === "Full Stack") {
      // Copy all files and directories from template to root
      for (const file of files.filter((f) => f !== "package.json")) {
        const sourcePath = path.join(templateDir, file);
        const targetPath = path.join(root, file);
        copy(sourcePath, targetPath);
      }
    } else {
      // For API-only projects, copy files directly to root
      for (const file of files.filter((f) => f !== "package.json")) {
        write(file);
      }
    }

    // Update package.json
    let pkg;

    if (template.requirements.projectType === "Full Stack") {
      // For full stack projects, read package.json from backend directory
      pkg = JSON.parse(
        fs.readFileSync(
          path.join(templateDir, "backend", "package.json"),
          "utf-8"
        )
      );

      // Create root package.json for full stack projects
      const rootPackageJson = {
        name: packageName || getProjectName(),
        version: "1.0.0",
        description: "Full Stack Application",
        scripts: {
          dev: 'concurrently "npm run dev:backend" "npm run dev:frontend"',
          "dev:backend": "cd backend && npm run dev",
          "dev:frontend": "cd client && npm run dev",
          build: "npm run build:backend && npm run build:frontend",
          "build:backend": "cd backend && npm run build",
          "build:frontend": "cd client && npm run build",
          "install:all":
            "npm install && cd backend && npm install && cd ../client && npm install",
          start: "cd backend && npm start",
        },
        devDependencies: {
          concurrently: "^8.2.2",
        },
      };

      write("package.json", JSON.stringify(rootPackageJson, null, 2) + "\n");

      // Update the backend package.json name
      const backendPackageJson = { ...pkg };
      backendPackageJson.name = `${packageName || getProjectName()}-backend`;
      fs.writeFileSync(
        path.join(root, "backend", "package.json"),
        JSON.stringify(backendPackageJson, null, 2) + "\n"
      );
    } else {
      // For API-only projects, read package.json from template root
      pkg = JSON.parse(
        fs.readFileSync(path.join(templateDir, "package.json"), "utf-8")
      );

      pkg.name = packageName || getProjectName();
      write("package.json", JSON.stringify(pkg, null, 2) + "\n");
    }

    spinner.succeed("Project created successfully!");

    // Create frontend if this is a full stack project
    if (
      template.requirements.projectType === "Full Stack" &&
      template.requirements.frontend
    ) {
      showStep(3.75, 4, "Creating frontend");
      await createFrontend(
        template.requirements.frontend,
        template.requirements.language,
        root,
        result.tailwind || false
      );
    }

    // Print final instructions
    showStep(4, 4, "Finalizing setup");

    const cdProjectName = path.relative(process.cwd(), root);

    // Show next steps in a nice box
    const isFullStack = template.requirements.projectType === "Full Stack";

    let nextSteps = "";
    if (root !== process.cwd()) {
      nextSteps += `${cyan(figures.pointer)} cd ${
        cdProjectName.includes(" ") ? `"${cdProjectName}"` : cdProjectName
      }\n`;
    }

    if (isFullStack) {
      nextSteps += `${cyan(figures.pointer)} npm run install:all\n`;
      nextSteps += `${cyan(
        figures.pointer
      )} npm run dev (runs both backend and frontend)\n`;
    } else {
      nextSteps += `${cyan(figures.pointer)} ${getPackageManagerCommand(
        process.env.npm_config_user_agent
      )}\n`;
    }

    nextSteps += `${cyan(
      figures.pointer
    )} Optional: Initialize git with 'git init'`;

    console.log(
      boxen(
        `${bold(greenBright("Success!"))} Project is ready.\n
${bold("Next steps:")}\n${nextSteps}`,
        { padding: 1, margin: 1, borderStyle: "round", borderColor: "green" }
      )
    );
  } catch (cancelled: any) {
    console.log(cancelled.message);
    return;
  }
}

// Helper functions
function formatTargetDir(targetDir: string | undefined) {
  return targetDir?.trim().replace(/\/+$/g, "");
}

function copy(src: string, dest: string) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    copyDir(src, dest);
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Validate package name
export function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(
    projectName
  );
}

// Convert project name to valid package name
function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]/, "")
    .replace(/[^a-z\d\-~]+/g, "-");
}

// Copy directory
function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);
    copy(srcFile, destFile);
  }
}

// Check if directory is empty
function isEmpty(path: string) {
  return (
    fs.readdirSync(path).length === 0 ||
    (fs.readdirSync(path).length === 1 && fs.readdirSync(path)[0] === ".git")
  );
}

// Empty directory
function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === ".git") {
      continue;
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
  }
}

// Parse package manager from user agent
function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent) return undefined;
  const pkgSpec = userAgent.split(" ")[0];
  const pkgSpecArr = pkgSpec.split("/");
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  };
}

init().catch((e) => {
  console.error(red("Error during initialization:"));
  console.error(e);
  process.exit(1);
});
