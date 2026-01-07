/*!
 * Copyright 2024, Staffbase GmbH and contributors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { UiSchema } from "@rjsf/utils";
import { JSONSchema7 } from "json-schema";

/**
 * schema used for generation of the configuration dialog
 * see https://rjsf-team.github.io/react-jsonschema-form/docs/ for documentation
 */
export const configurationSchema: JSONSchema7 = {
  properties: {
    symbol: {
      type: "string",
      title: "symbol",
    },
    weeks: {
      type: "string",
      title: "weeks",
    },
    logo: {
      type: "string",
      title: "logo",
    },
    stockgraphcolor: {
      type: "string",
      title: "stock graph color",
    }
  },
};

/**
 * schema to add more customization to the form's look and feel
 * @see https://rjsf-team.github.io/react-jsonschema-form/docs/api-reference/uiSchema
 */
export const uiSchema: UiSchema = {
  symbol: {
    "ui:help": "Enter the stock ticker symbol (e.g., AAPL for Apple, GOOG for Google). Defaults to dummy data if left blank or set to 'VNI'",
  },
  weeks: {
    "ui:help": "Specify how many weeks of historical stock data to display in the graph. Maximum allowed is 104 weeks (2 years).",
  },
  logo: {
    "ui:help": "(Optional) Enter the direct URL of a company logo image. This will override any logo fetched from the stock data API.",
  },
  stockgraphcolor: {
    "ui:help": "Choose a color for the stock graph. (eg #000, blue) Defaults to green if left blank.",
  },
};