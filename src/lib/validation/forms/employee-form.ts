import { z } from "zod";

export const employeeFormSchema = z.object({
  id: z.string().uuid().optional(),
  employeeNo: z.string().min(1, "Employee number is required").max(50),
  fullName: z.string().min(1, "Name is required").max(200),
  position: z.string().max(150).optional().or(z.literal("")),
  department: z.string().max(120).optional().or(z.literal("")),
  employmentType: z.enum(["regular", "probationary", "contractual", "project"]).default("probationary"),
  dateHired: z.string().min(1, "Date hired is required"),
  dateRegularized: z.string().optional().or(z.literal("")),
  rateType: z.enum(["daily", "monthly"]).default("daily"),
  ratePesos: z.coerce.number().nonnegative().default(0),
  sssNo: z.string().max(40).optional().or(z.literal("")),
  philhealthNo: z.string().max(40).optional().or(z.literal("")),
  pagibigNo: z.string().max(40).optional().or(z.literal("")),
  tin: z.string().max(40).optional().or(z.literal("")),
  emergencyContact: z.string().max(300).optional().or(z.literal("")),
  status: z.enum(["active", "resigned", "terminated", "awol"]).default("active"),
  userId: z.string().uuid().optional().or(z.literal("")),
});
export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
