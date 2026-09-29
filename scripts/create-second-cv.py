from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

OUTPUT = r"C:\Users\sohai\Documents\ayesha-khan-frontend-developer-cv.pdf"

green = colors.HexColor("#0B7A75")
dark = colors.HexColor("#172026")
muted = colors.HexColor("#53636D")
light = colors.HexColor("#E8F3F1")

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=letter,
    rightMargin=0.62 * inch,
    leftMargin=0.62 * inch,
    topMargin=0.48 * inch,
    bottomMargin=0.48 * inch,
)
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="Name", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=25, leading=28, textColor=dark, spaceAfter=3))
styles.add(ParagraphStyle(name="Role", parent=styles["Normal"], fontName="Helvetica", fontSize=11.5, leading=15, textColor=green, spaceAfter=7))
styles.add(ParagraphStyle(name="Contact", parent=styles["Normal"], fontName="Helvetica", fontSize=8.7, leading=12, textColor=muted))
styles.add(ParagraphStyle(name="Section", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=green, spaceBefore=10, spaceAfter=4))
styles.add(ParagraphStyle(name="Body", parent=styles["Normal"], fontName="Helvetica", fontSize=9.2, leading=13, textColor=dark, spaceAfter=3))
styles.add(ParagraphStyle(name="Job", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9.5, leading=12, textColor=dark))
styles.add(ParagraphStyle(name="Meta", parent=styles["Normal"], fontName="Helvetica-Oblique", fontSize=8.5, leading=11, textColor=muted))
styles.add(ParagraphStyle(name="MyBullet", parent=styles["Normal"], fontName="Helvetica", fontSize=8.9, leading=12.5, leftIndent=11, firstLineIndent=-7, textColor=dark, spaceAfter=1))

story = []
story.append(Paragraph("AYESHA KHAN", styles["Name"]))
story.append(Paragraph("Frontend Developer", styles["Role"]))
story.append(Paragraph("Lahore, Pakistan  |  candidate2@test.com  |  +92 300 123 4567  |  linkedin.com/in/ayeshakhan", styles["Contact"]))
story.append(Spacer(1, 7))
story.append(HRFlowable(width="100%", thickness=1.2, color=green, spaceAfter=4))

story.append(Paragraph("PROFILE", styles["Section"]))
story.append(Paragraph("Frontend Developer with 4 years of experience building responsive web applications with React, TypeScript, and Next.js. Strong focus on accessible interfaces, reusable components, API integration, and reliable delivery in agile teams.", styles["Body"]))

story.append(Paragraph("CORE SKILLS", styles["Section"]))
skills = [[Paragraph("Frontend", styles["Job"]), Paragraph("React, TypeScript, JavaScript, Next.js, HTML5, CSS3", styles["Body"])],
          [Paragraph("Engineering", styles["Job"]), Paragraph("REST APIs, Git, unit testing, responsive design, accessibility", styles["Body"])],
          [Paragraph("Tools", styles["Job"]), Paragraph("GitHub, Figma, Jira, Vercel, PostgreSQL", styles["Body"])]]
t = Table(skills, colWidths=[1.05*inch, 5.9*inch])
t.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP"), ("BACKGROUND", (0,0), (0,-1), light), ("BOX", (0,0), (-1,-1), 0.4, colors.HexColor("#C6DFDB")), ("INNERGRID", (0,0), (-1,-1), 0.3, colors.HexColor("#D6E9E6")), ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6), ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4)]))
story.append(t)

story.append(Paragraph("EXPERIENCE", styles["Section"]))
story.append(Paragraph("Frontend Developer | Digital Products Studio | Lahore | 2022 - Present", styles["Job"]))
story.append(Paragraph("- Built and maintained customer-facing React and Next.js features used by internal and external users.", styles["MyBullet"]))
story.append(Paragraph("- Integrated REST APIs and improved page performance through component reuse and optimized data loading.", styles["MyBullet"]))
story.append(Paragraph("- Worked with designers and QA to deliver accessible, responsive screens across desktop and mobile.", styles["MyBullet"]))
story.append(Spacer(1, 4))
story.append(Paragraph("Junior Web Developer | Bright Labs | Lahore | 2020 - 2022", styles["Job"]))
story.append(Paragraph("- Developed reusable UI components and fixed cross-browser layout and usability issues.", styles["MyBullet"]))
story.append(Paragraph("- Added test coverage for critical forms and collaborated through Git pull requests.", styles["MyBullet"]))

story.append(Paragraph("SELECTED PROJECT", styles["Section"]))
story.append(Paragraph("Hiring Dashboard - Created a role management dashboard with job listings, application stages, recruiter assignment, and candidate profile views using Next.js, TypeScript, and Supabase.", styles["Body"]))

story.append(Paragraph("EDUCATION", styles["Section"]))
story.append(Paragraph("BS Computer Science | University of Lahore | 2016 - 2020", styles["Body"]))

story.append(Paragraph("CERTIFICATION", styles["Section"]))
story.append(Paragraph("Meta Front-End Developer Professional Certificate | 2023", styles["Body"]))

doc.build(story)
print(OUTPUT)
