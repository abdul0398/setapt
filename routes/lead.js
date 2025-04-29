import express from "express";
const router = express.Router();
import multer from "multer";
import fs from "fs";
import csvParser from "csv-parser";
import { verify } from "../middlewares/verify.js";

const upload = multer({ dest: "uploads/" });

router
  .get("/leads", verify, async (req, res, next) => {
    if (req?.user?.role == "user_2") {
      next();
      return;
    }
    try {
      const [clients] = await __pool.query(
        `SELECT * FROM clients ORDER BY name ASC`
      );
      const [forms] = await __pool.query(`SELECT * FROM forms`);

      // unique bot names
      const uniqueBotNames = [...new Set(forms.map((form) => form.bot_name))]
        .sort()
        .filter((botNames) => botNames !== "");

      const uniqueClientNames = [
        ...new Set(forms.map((form) => form.client_name)),
      ]
        .sort()
        .filter((clientName) => clientName !== "");

      const uniqueProjectNames = [
        ...new Set(forms.map((form) => form.project_name)),
      ]
        .sort()
        .filter((projectName) => projectName !== "");
      res.render("leads.ejs", {
        clients,
        forms,
        botNames: uniqueBotNames,
        clientNames: uniqueClientNames,
        projectNames: uniqueProjectNames,
      });
    } catch (error) {
      console.error(error);
      next();
    }
  })
  .get("/api/fetch/leads", verify, async (req, res, next) => {
    try {
      const query = `
            SELECT 
                leads.id,
                leads.client_id,
                leads.form_id,
                leads.name,
                leads.email,
                leads.phone,
                leads.ip_address,
                leads.status,
                leads.is_send_discord,
                leads.is_read,
                leads.params,
                leads.source_url,
                leads.send_by_admin,
                leads.created_at,
                leads.updated_at,
                clients.name AS client_name,
                forms.name AS form_name
            FROM 
                leads
            JOIN 
                clients ON leads.client_id = clients.id
            JOIN 
                forms ON leads.form_id = forms.id
            WHERE 
                leads.email NOT LIKE '%jome%' 
                AND leads.email NOT LIKE '%test%'
                AND leads.name NOT LIKE '%test%'
                AND leads.name NOT LIKE '%jome%'
            ORDER BY 
                leads.created_at DESC;
        `;

      const [leads] = await __pool.query(query);
      res.status(200).json(leads);
    } catch (error) {
      console.error(error);
      next();
    }
  })
  .post("/api/leads/status/:status", verify, async (req, res) => {
    const { ids } = req.body;
    const { status } = req.params;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid input" });
    }
    try {
      let field = "status";
      let value = status;
      if (status == "read") {
        field = "is_read";
        value = 1;
      }

      const query = `
        UPDATE leads
        SET ${field} = ?
        WHERE id IN (?)
    `;
      await __pool.query(query, [value, ids]);
      res
        .status(200)
        .json({ message: `Leads marked as ${status} successfully` });
    } catch (error) {
      console.error("Error marking leads as junk:", error);
      res
        .status(500)
        .json({ error: "An error occurred while updating the leads" });
    }
  })
  .post("/api/leads/sendTodiscord/", verify, async (req, res, next) => {
    const { ids } = req.body;
    try {
      // get all leads with the ids
      const [leads] = await __pool.query(
        `SELECT * FROM leads WHERE id IN (?)`,
        [ids]
      );
      discordBulkSender(leads);
      res.status(200).json({ message: "Leads started sending to Discord" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  })
  .get("/api/status/dnc", verify, async (req, res) => {
    try {
      // Fetch distinct phone numbers
      const [rows] = await __pool.query("SELECT DISTINCT phone FROM leads");
      const phones = rows.map((row) => row.phone);

      // // Check DNC status
      const result = await checkDncMulti(phones);
      const phoneWithDNC = result
        .filter((phone) => phone.status === "DNC Registry")
        .map((phone) => phone.phone);

      if (phoneWithDNC.length === 0) {
        return res
          .status(200)
          .json({ msg: "Successfully Synced the DNC status" });
      }

      // Update the DNC status
      await __pool.query("UPDATE leads SET status = ? WHERE phone IN (?)", [
        "dnc",
        phoneWithDNC,
      ]);

      return res
        .status(200)
        .json({ msg: "Successfully Synced the DNC status" });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: "An error occurred while syncing the DNC status" });
    }
  })
  .post(
    "/api/upload/leads",
    verify,
    upload.single("file"),
    async (req, res) => {
      try {
        const filePath = req.file.path;

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const leads = [];

        // Read and parse the CSV file
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on("data", (row) => {
            // Extract fields from each row
            const {
              name,
              email,
              phone,
              ip,
              client_id,
              form_id,
              status,
              created_at,
              is_send_discord,
              additional_fields,
            } = row;

            // Validate the data (optional, based on your requirements)
            if (!name || !email || !phone || !client_id || !form_id) {
              return;
            }

            leads.push({
              name,
              email,
              phone,
              ip_address: ip || null,
              client_id,
              form_id,
              status: status || "new",
              is_send_discord: is_send_discord || 0,
              more_fields: additional_fields || null,
              created_at: created_at || new Date(),
              updated_at: created_at || new Date(),
            });
          })
          .on("end", async () => {
            try {
              // Insert the leads into the database
              if (leads.length > 0) {
                const placeholders = leads
                  .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                  .join(", ");
                const values = leads.flatMap((lead) => [
                  lead.name,
                  lead.email,
                  lead.phone,
                  lead.ip_address,
                  lead.client_id,
                  lead.form_id,
                  lead.status,
                  lead.is_send_discord,
                  lead.more_fields,
                  lead.created_at,
                  lead.updated_at,
                ]);

                const query = `INSERT INTO leads (name, email, phone, ip_address, client_id, form_id, status, is_send_discord, more_fields, created_at, updated_at) VALUES ${placeholders}`;

                await __pool.query(query, values);
              }

              // Delete the uploaded file
              fs.unlinkSync(filePath);

              res
                .status(200)
                .json({ message: "Leads successfully uploaded and saved." });
            } catch (error) {
              console.error("Error saving leads:", error);
              res
                .status(500)
                .json({ error: "An error occurred while saving leads." });
            }
          });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .json({ error: "An error occurred while processing the file." });
      }
    }
  )
  .post("/api/leads/import/:clientId/:formId", async (req, res) => {
    const data = req.body;
    const formID = req.params.formId;
    const clientId = req.params.clientId;

    const leads = data.leads;

    for (let lead of leads) {
      let name = "";
      let email = "";
      let phone = "";

      let cleanData = {
        ...lead,
      };

      const selects = [];

      let firstName = "";
      let lastName = "";

      for (let key in cleanData) {
        if (!cleanData[key]) {
          continue;
        }
        const isFirstName =
          key.toLowerCase().includes("first") &&
          key.toLowerCase().includes("name");
        if (isFirstName) {
          firstName = cleanData[key];
        }
        const isLastName =
          key.toLowerCase().includes("last") &&
          key.toLowerCase().includes("name");
        if (isLastName) {
          lastName = cleanData[key];
        }
      }

      if (firstName && lastName) {
        name = `${firstName} ${lastName}`;
      }

      for (let key in cleanData) {
        if (cleanData[key]) {
          const fieldName =
            key.charAt(0).toUpperCase().replace(":", "") +
            key.slice(1).replace(":", "");
          const fieldValue = cleanData[key]
            ? cleanData[key].charAt(0).toUpperCase().replace(":", "") +
              cleanData[key].slice(1).replace(":", "")
            : "";

          if (
            key.toLocaleLowerCase().includes("name") &&
            !key.toLocaleLowerCase().includes("form") &&
            name == ""
          ) {
            name = cleanData[key];
          } else if (key.toLocaleLowerCase().includes("email")) {
            email = cleanData[key];
          } else if (
            key.toLocaleLowerCase().includes("phone") ||
            key.toLocaleLowerCase().includes("contact") ||
            key.toLocaleLowerCase().includes("mobile")
          ) {
            phone = cleanData[key];
            if (phone.startsWith("65")) {
              phone = phone.slice(2);
            }
          } else if (
            fieldName != "Form_name" &&
            fieldName != "Form_id" &&
            fieldValue.toLocaleLowerCase() != "on" &&
            fieldValue.toLocaleLowerCase() != "off" &&
            !fieldName.toLocaleLowerCase().includes("checkbox")
          ) {
            if (fieldName.toLocaleLowerCase().includes("request")) {
              selects.push({ name: "Request for", value: fieldValue });
            } else if (fieldName.toLocaleLowerCase().includes("bedroom")) {
              selects.push({ name: "Bedroom", value: fieldValue });
            } else if (
              key.toLocaleLowerCase().includes("phone") ||
              key.toLocaleLowerCase().includes("contact") ||
              key.toLocaleLowerCase().includes("mobile")
            ) {
              selects.push({ name: "Phone", value: fieldValue });
            } else if (fieldName.toLowerCase() == "form_type") {
              selects.push({ name: "Form Type", value: fieldValue });
            } else {
              selects.push({
                name: fieldName.replace(/_/g, " "),
                value: fieldValue,
              });
            }
          }
        }
      }

      let dataToSave = {
        client_id: null,
        project_id: null,
        is_verified: 0,
        status: "clear",
        is_send_discord: 0,
        name: name,
        is_webhook: false,
        ph_number: phone,
        ip_address: lead["Remote IP"] || "0.0.0.0.0",
        source_url: lead["Page URL"],
        created_at: lead["date"],
        params: {
          utm_source: lead.utm_source || null,
          utm_medium: lead.utm_medium || null,
          utm_campaign: lead.utm_campaign || null,
          utm_content: lead.utm_content || null,
          utm_term: lead.utm_term || null,
          match_type: lead.match_type || null,
          extension: lead.extension || null,
          device: lead.device || null,
          location: lead.location || null,
          placement_category: lead.placement_category || null,
        },
        email: email,
      };
      try {
        await saveLeadToLocalDb(dataToSave, clientId, formID, selects);
      } catch (error) {
        console.log(error.message);
      }
    }

    return res.status(200).json({
      message: "Leads imported successfully",
    });
  })
  .get("/all-leads/:leadType", verify, async (req, res, next) => {
    try {
      const { leadType } = req.params;

      res.render("allLeads.ejs", {
        leads_type: leadType,
      });
    } catch (error) {
      console.log(error.message);
    }
  })
  .get("/api/leads/types", verify, async (req, res, next) => {
    try {
      const { type, page, sortModel, filterModel, limit, csv } = req.query;
      let leads = [];
      switch (type) {
        case "master-leads":
          leads = await getMasterLeads(
            limit,
            page,
            sortModel,
            filterModel,
            csv
          );
          break;

        default:
          break;
      }

      res.status(200).json(leads);
    } catch (error) {
      console.log(error.message);
    }
  })
  .get("/leads/round-robin", verify, async (req, res) => {
    res.render("roundRobinLeads.ejs");
  })
  .get("/api/round-robin/subaccounts", verify, async (req, res) => {
    try {
      const subAccounts = await getSubAccounts();
      res.status(200).json(subAccounts);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  })
  .get("/api/round-robin/leads/:subAccountId", verify, async (req, res) => {
    const { subAccountId } = req.params;
    try {
      const subAccountLeads = await getSubAccountLeas(subAccountId);
      res.status(200).json(subAccountLeads);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  });

export default router;
