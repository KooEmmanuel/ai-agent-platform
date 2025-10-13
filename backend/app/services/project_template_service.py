"""
Project Template Service
Professional project management templates based on industry standards
"""

from typing import Dict, List, Any
from datetime import datetime, timedelta

class ProjectTemplateService:
    """Service for managing project templates with professional standards"""
    
    @staticmethod
    def get_default_templates() -> Dict[str, Dict[str, Any]]:
        """Get all default project templates"""
        print("🏗️ [TEMPLATE_SERVICE] Building default templates...")
        templates = {
            "software_development": ProjectTemplateService._get_software_development_template(),
            "marketing_campaign": ProjectTemplateService._get_marketing_campaign_template(),
            "event_planning": ProjectTemplateService._get_event_planning_template(),
            "research_project": ProjectTemplateService._get_research_project_template(),
            "product_launch": ProjectTemplateService._get_product_launch_template(),
            "consulting_engagement": ProjectTemplateService._get_consulting_engagement_template()
        }
        print(f"🏗️ [TEMPLATE_SERVICE] Built {len(templates)} templates: {list(templates.keys())}")
        return templates
    
    @staticmethod
    def _get_software_development_template() -> Dict[str, Any]:
        """Software Development Template - Based on Agile/Scrum methodology"""
        return {
            "name": "Software Development",
            "description": "Agile software development project following Scrum methodology with sprints, user stories, and continuous integration",
            "methodology": "Agile/Scrum",
            "estimated_duration": "12-16 weeks",
            "phases": [
                {
                    "name": "Project Initiation",
                    "duration_weeks": 2,
                    "description": "Project setup, team formation, and initial planning",
                    "tasks": [
                        {
                            "title": "Project Charter & Scope Definition",
                            "description": "Define project objectives, scope, success criteria, and constraints",
                            "priority": "high",
                            "estimated_hours": 16,
                            "assignee_role": "product_owner"
                        },
                        {
                            "title": "Team Assembly & Role Definition",
                            "description": "Assemble development team and define roles (Scrum Master, Product Owner, Developers)",
                            "priority": "high",
                            "estimated_hours": 8,
                            "assignee_role": "scrum_master"
                        },
                        {
                            "title": "Development Environment Setup",
                            "description": "Set up CI/CD pipeline, version control, testing frameworks, and development tools",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "devops_engineer"
                        },
                        {
                            "title": "Initial User Story Creation",
                            "description": "Create initial product backlog with user stories and acceptance criteria",
                            "priority": "medium",
                            "estimated_hours": 20,
                            "assignee_role": "product_owner"
                        }
                    ]
                },
                {
                    "name": "Sprint Planning & Development",
                    "duration_weeks": 10,
                    "description": "Iterative development cycles with regular sprints",
                    "tasks": [
                        {
                            "title": "Sprint Planning Sessions",
                            "description": "Plan each sprint, estimate story points, and commit to sprint goals",
                            "priority": "high",
                            "estimated_hours": 8,
                            "assignee_role": "scrum_master",
                            "recurring": True,
                            "recurring_frequency": "sprint"
                        },
                        {
                            "title": "Daily Standups",
                            "description": "Daily team synchronization meetings to discuss progress and blockers",
                            "priority": "medium",
                            "estimated_hours": 1,
                            "assignee_role": "scrum_master",
                            "recurring": True,
                            "recurring_frequency": "daily"
                        },
                        {
                            "title": "Feature Development",
                            "description": "Develop features according to user stories and acceptance criteria",
                            "priority": "high",
                            "estimated_hours": 320,
                            "assignee_role": "developer"
                        },
                        {
                            "title": "Code Reviews",
                            "description": "Peer code reviews to maintain code quality and knowledge sharing",
                            "priority": "high",
                            "estimated_hours": 80,
                            "assignee_role": "senior_developer"
                        },
                        {
                            "title": "Unit Testing",
                            "description": "Write and maintain unit tests for all developed features",
                            "priority": "high",
                            "estimated_hours": 120,
                            "assignee_role": "developer"
                        },
                        {
                            "title": "Integration Testing",
                            "description": "Test integration between different system components",
                            "priority": "medium",
                            "estimated_hours": 40,
                            "assignee_role": "qa_engineer"
                        }
                    ]
                },
                {
                    "name": "Testing & Quality Assurance",
                    "duration_weeks": 2,
                    "description": "Comprehensive testing and quality assurance",
                    "tasks": [
                        {
                            "title": "System Testing",
                            "description": "End-to-end system testing to verify all features work together",
                            "priority": "high",
                            "estimated_hours": 32,
                            "assignee_role": "qa_engineer"
                        },
                        {
                            "title": "Performance Testing",
                            "description": "Load testing, stress testing, and performance optimization",
                            "priority": "medium",
                            "estimated_hours": 24,
                            "assignee_role": "performance_engineer"
                        },
                        {
                            "title": "Security Testing",
                            "description": "Security vulnerability assessment and penetration testing",
                            "priority": "high",
                            "estimated_hours": 16,
                            "assignee_role": "security_engineer"
                        },
                        {
                            "title": "User Acceptance Testing",
                            "description": "Final testing with end users to validate business requirements",
                            "priority": "high",
                            "estimated_hours": 20,
                            "assignee_role": "product_owner"
                        }
                    ]
                },
                {
                    "name": "Deployment & Launch",
                    "duration_weeks": 2,
                    "description": "Production deployment and go-live activities",
                    "tasks": [
                        {
                            "title": "Production Environment Setup",
                            "description": "Configure production servers, databases, and monitoring systems",
                            "priority": "high",
                            "estimated_hours": 16,
                            "assignee_role": "devops_engineer"
                        },
                        {
                            "title": "Deployment Pipeline Setup",
                            "description": "Configure automated deployment pipeline for production releases",
                            "priority": "high",
                            "estimated_hours": 12,
                            "assignee_role": "devops_engineer"
                        },
                        {
                            "title": "Production Deployment",
                            "description": "Deploy application to production environment",
                            "priority": "high",
                            "estimated_hours": 8,
                            "assignee_role": "devops_engineer"
                        },
                        {
                            "title": "Post-Launch Monitoring",
                            "description": "Monitor system performance and user feedback after launch",
                            "priority": "medium",
                            "estimated_hours": 16,
                            "assignee_role": "devops_engineer"
                        },
                        {
                            "title": "Documentation & Training",
                            "description": "Create user documentation and conduct training sessions",
                            "priority": "medium",
                            "estimated_hours": 20,
                            "assignee_role": "technical_writer"
                        }
                    ]
                }
            ],
            "milestones": [
                {
                    "title": "Project Kickoff Complete",
                    "description": "Project initiation phase completed successfully",
                    "due_date_offset_weeks": 2
                },
                {
                    "title": "MVP Development Complete",
                    "description": "Minimum Viable Product ready for testing",
                    "due_date_offset_weeks": 8
                },
                {
                    "title": "Beta Release",
                    "description": "Beta version released for user testing",
                    "due_date_offset_weeks": 12
                },
                {
                    "title": "Production Launch",
                    "description": "Application successfully launched in production",
                    "due_date_offset_weeks": 14
                }
            ],
            "team_roles": [
                {"role": "product_owner", "description": "Defines requirements and prioritizes features"},
                {"role": "scrum_master", "description": "Facilitates Scrum process and removes impediments"},
                {"role": "developer", "description": "Develops features and writes code"},
                {"role": "senior_developer", "description": "Technical lead and code reviewer"},
                {"role": "qa_engineer", "description": "Quality assurance and testing"},
                {"role": "devops_engineer", "description": "Infrastructure and deployment"},
                {"role": "ui_ux_designer", "description": "User interface and experience design"},
                {"role": "technical_writer", "description": "Documentation and user guides"}
            ],
            "settings": {
                "sprint_duration_weeks": 2,
                "daily_standup_time": "09:00",
                "sprint_planning_duration_hours": 4,
                "sprint_review_duration_hours": 2,
                "retrospective_duration_hours": 1.5,
                "code_review_required": True,
                "test_coverage_threshold": 80,
                "deployment_approval_required": True
            }
        }
    
    @staticmethod
    def _get_marketing_campaign_template() -> Dict[str, Any]:
        """Marketing Campaign Template - Based on digital marketing best practices"""
        return {
            "name": "Marketing Campaign",
            "description": "Comprehensive digital marketing campaign with strategy, content creation, execution, and analytics",
            "methodology": "Digital Marketing Framework",
            "estimated_duration": "8-12 weeks",
            "phases": [
                {
                    "name": "Strategy & Planning",
                    "duration_weeks": 2,
                    "description": "Campaign strategy development and planning",
                    "tasks": [
                        {
                            "title": "Market Research & Analysis",
                            "description": "Analyze target audience, competitors, and market trends",
                            "priority": "high",
                            "estimated_hours": 20,
                            "assignee_role": "market_researcher"
                        },
                        {
                            "title": "Campaign Strategy Development",
                            "description": "Define campaign objectives, KPIs, and success metrics",
                            "priority": "high",
                            "estimated_hours": 16,
                            "assignee_role": "marketing_manager"
                        },
                        {
                            "title": "Budget Planning & Allocation",
                            "description": "Allocate budget across different marketing channels and activities",
                            "priority": "high",
                            "estimated_hours": 8,
                            "assignee_role": "marketing_manager"
                        },
                        {
                            "title": "Content Calendar Creation",
                            "description": "Plan content themes, topics, and publishing schedule",
                            "priority": "medium",
                            "estimated_hours": 12,
                            "assignee_role": "content_manager"
                        }
                    ]
                },
                {
                    "name": "Content Creation",
                    "duration_weeks": 3,
                    "description": "Create marketing content and assets",
                    "tasks": [
                        {
                            "title": "Brand Assets Development",
                            "description": "Create logos, banners, and visual brand elements",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "graphic_designer"
                        },
                        {
                            "title": "Content Writing",
                            "description": "Write blog posts, social media content, and marketing copy",
                            "priority": "high",
                            "estimated_hours": 40,
                            "assignee_role": "content_writer"
                        },
                        {
                            "title": "Video Production",
                            "description": "Create promotional videos and video content",
                            "priority": "medium",
                            "estimated_hours": 32,
                            "assignee_role": "video_producer"
                        },
                        {
                            "title": "Email Template Design",
                            "description": "Design and code email templates for email marketing",
                            "priority": "medium",
                            "estimated_hours": 16,
                            "assignee_role": "email_designer"
                        }
                    ]
                },
                {
                    "name": "Campaign Execution",
                    "duration_weeks": 4,
                    "description": "Launch and manage marketing campaigns",
                    "tasks": [
                        {
                            "title": "Social Media Campaign Launch",
                            "description": "Launch and manage social media advertising campaigns",
                            "priority": "high",
                            "estimated_hours": 32,
                            "assignee_role": "social_media_manager"
                        },
                        {
                            "title": "Email Marketing Campaign",
                            "description": "Execute email marketing campaigns and nurture sequences",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "email_marketer"
                        },
                        {
                            "title": "SEO Optimization",
                            "description": "Optimize website and content for search engines",
                            "priority": "medium",
                            "estimated_hours": 20,
                            "assignee_role": "seo_specialist"
                        },
                        {
                            "title": "Paid Advertising Management",
                            "description": "Manage Google Ads, Facebook Ads, and other paid campaigns",
                            "priority": "high",
                            "estimated_hours": 28,
                            "assignee_role": "ppc_specialist"
                        },
                        {
                            "title": "Influencer Outreach",
                            "description": "Identify and collaborate with relevant influencers",
                            "priority": "medium",
                            "estimated_hours": 16,
                            "assignee_role": "influencer_manager"
                        }
                    ]
                },
                {
                    "name": "Analysis & Optimization",
                    "duration_weeks": 3,
                    "description": "Monitor performance and optimize campaigns",
                    "tasks": [
                        {
                            "title": "Performance Monitoring",
                            "description": "Track campaign performance and key metrics daily",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "marketing_analyst"
                        },
                        {
                            "title": "A/B Testing",
                            "description": "Conduct A/B tests on ads, emails, and landing pages",
                            "priority": "medium",
                            "estimated_hours": 16,
                            "assignee_role": "marketing_analyst"
                        },
                        {
                            "title": "Campaign Optimization",
                            "description": "Optimize campaigns based on performance data",
                            "priority": "high",
                            "estimated_hours": 20,
                            "assignee_role": "marketing_manager"
                        },
                        {
                            "title": "ROI Analysis & Reporting",
                            "description": "Calculate ROI and create comprehensive campaign reports",
                            "priority": "high",
                            "estimated_hours": 12,
                            "assignee_role": "marketing_analyst"
                        }
                    ]
                }
            ],
            "milestones": [
                {
                    "title": "Strategy Complete",
                    "description": "Marketing strategy and planning phase completed",
                    "due_date_offset_weeks": 2
                },
                {
                    "title": "Content Ready",
                    "description": "All marketing content and assets created",
                    "due_date_offset_weeks": 5
                },
                {
                    "title": "Campaign Launch",
                    "description": "Marketing campaigns launched across all channels",
                    "due_date_offset_weeks": 6
                },
                {
                    "title": "Mid-Campaign Review",
                    "description": "Mid-campaign performance review and optimization",
                    "due_date_offset_weeks": 8
                },
                {
                    "title": "Campaign Complete",
                    "description": "Campaign execution completed with final analysis",
                    "due_date_offset_weeks": 12
                }
            ],
            "team_roles": [
                {"role": "marketing_manager", "description": "Overall campaign strategy and management"},
                {"role": "content_manager", "description": "Content strategy and editorial oversight"},
                {"role": "content_writer", "description": "Copywriting and content creation"},
                {"role": "graphic_designer", "description": "Visual design and brand assets"},
                {"role": "social_media_manager", "description": "Social media strategy and execution"},
                {"role": "email_marketer", "description": "Email marketing campaigns and automation"},
                {"role": "ppc_specialist", "description": "Paid advertising and PPC management"},
                {"role": "seo_specialist", "description": "Search engine optimization"},
                {"role": "marketing_analyst", "description": "Data analysis and performance tracking"},
                {"role": "video_producer", "description": "Video content creation and production"}
            ],
            "settings": {
                "campaign_duration_weeks": 8,
                "reporting_frequency": "weekly",
                "budget_alert_threshold": 80,
                "performance_review_frequency": "bi_weekly",
                "a_b_testing_enabled": True,
                "automation_enabled": True
            }
        }
    
    @staticmethod
    def _get_event_planning_template() -> Dict[str, Any]:
        """Event Planning Template - Based on event management best practices"""
        return {
            "name": "Event Planning",
            "description": "Comprehensive event planning and execution with venue management, logistics, and post-event analysis",
            "methodology": "Event Management Framework",
            "estimated_duration": "12-16 weeks",
            "phases": [
                {
                    "name": "Event Conceptualization",
                    "duration_weeks": 2,
                    "description": "Define event concept, objectives, and initial planning",
                    "tasks": [
                        {
                            "title": "Event Objectives & Goals",
                            "description": "Define event purpose, target audience, and success metrics",
                            "priority": "high",
                            "estimated_hours": 12,
                            "assignee_role": "event_manager"
                        },
                        {
                            "title": "Budget Planning",
                            "description": "Create comprehensive budget including all event costs",
                            "priority": "high",
                            "estimated_hours": 16,
                            "assignee_role": "event_manager"
                        },
                        {
                            "title": "Venue Research & Selection",
                            "description": "Research and evaluate potential venues",
                            "priority": "high",
                            "estimated_hours": 20,
                            "assignee_role": "venue_coordinator"
                        },
                        {
                            "title": "Timeline Development",
                            "description": "Create detailed project timeline with key milestones",
                            "priority": "medium",
                            "estimated_hours": 8,
                            "assignee_role": "event_manager"
                        }
                    ]
                },
                {
                    "name": "Planning & Coordination",
                    "duration_weeks": 6,
                    "description": "Detailed planning and vendor coordination",
                    "tasks": [
                        {
                            "title": "Vendor Management",
                            "description": "Source, negotiate, and contract with vendors (catering, AV, decor)",
                            "priority": "high",
                            "estimated_hours": 32,
                            "assignee_role": "vendor_coordinator"
                        },
                        {
                            "title": "Speaker & Talent Booking",
                            "description": "Identify, contact, and book speakers or entertainment",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "talent_coordinator"
                        },
                        {
                            "title": "Marketing & Promotion",
                            "description": "Develop marketing strategy and promotional materials",
                            "priority": "medium",
                            "estimated_hours": 28,
                            "assignee_role": "marketing_coordinator"
                        },
                        {
                            "title": "Registration System Setup",
                            "description": "Set up event registration and ticketing system",
                            "priority": "medium",
                            "estimated_hours": 16,
                            "assignee_role": "tech_coordinator"
                        },
                        {
                            "title": "Logistics Planning",
                            "description": "Plan transportation, parking, security, and other logistics",
                            "priority": "high",
                            "estimated_hours": 20,
                            "assignee_role": "logistics_coordinator"
                        }
                    ]
                },
                {
                    "name": "Pre-Event Preparation",
                    "duration_weeks": 2,
                    "description": "Final preparations and rehearsals",
                    "tasks": [
                        {
                            "title": "Final Vendor Confirmations",
                            "description": "Confirm all vendor arrangements and final details",
                            "priority": "high",
                            "estimated_hours": 12,
                            "assignee_role": "vendor_coordinator"
                        },
                        {
                            "title": "Event Rehearsal",
                            "description": "Conduct full event rehearsal with all stakeholders",
                            "priority": "high",
                            "estimated_hours": 8,
                            "assignee_role": "event_manager"
                        },
                        {
                            "title": "Staff Training & Briefing",
                            "description": "Train event staff and volunteers on procedures",
                            "priority": "medium",
                            "estimated_hours": 16,
                            "assignee_role": "event_manager"
                        },
                        {
                            "title": "Final Marketing Push",
                            "description": "Execute final marketing campaigns and promotions",
                            "priority": "medium",
                            "estimated_hours": 12,
                            "assignee_role": "marketing_coordinator"
                        }
                    ]
                },
                {
                    "name": "Event Execution",
                    "duration_weeks": 1,
                    "description": "Event day execution and management",
                    "tasks": [
                        {
                            "title": "Event Setup",
                            "description": "Set up venue, equipment, and all event elements",
                            "priority": "high",
                            "estimated_hours": 8,
                            "assignee_role": "setup_crew"
                        },
                        {
                            "title": "Event Management",
                            "description": "Manage event execution and handle any issues",
                            "priority": "high",
                            "estimated_hours": 12,
                            "assignee_role": "event_manager"
                        },
                        {
                            "title": "Guest Services",
                            "description": "Provide guest services and handle attendee needs",
                            "priority": "medium",
                            "estimated_hours": 8,
                            "assignee_role": "guest_services"
                        },
                        {
                            "title": "Event Breakdown",
                            "description": "Break down event setup and clean up venue",
                            "priority": "medium",
                            "estimated_hours": 6,
                            "assignee_role": "setup_crew"
                        }
                    ]
                },
                {
                    "name": "Post-Event Analysis",
                    "duration_weeks": 1,
                    "description": "Post-event evaluation and reporting",
                    "tasks": [
                        {
                            "title": "Vendor Settlement",
                            "description": "Process final payments and settle with vendors",
                            "priority": "high",
                            "estimated_hours": 8,
                            "assignee_role": "vendor_coordinator"
                        },
                        {
                            "title": "Attendee Feedback Collection",
                            "description": "Collect and analyze attendee feedback",
                            "priority": "medium",
                            "estimated_hours": 12,
                            "assignee_role": "event_manager"
                        },
                        {
                            "title": "Financial Reconciliation",
                            "description": "Reconcile all event expenses and revenue",
                            "priority": "high",
                            "estimated_hours": 10,
                            "assignee_role": "event_manager"
                        },
                        {
                            "title": "Post-Event Report",
                            "description": "Create comprehensive post-event analysis report",
                            "priority": "medium",
                            "estimated_hours": 8,
                            "assignee_role": "event_manager"
                        }
                    ]
                }
            ],
            "milestones": [
                {
                    "title": "Event Concept Approved",
                    "description": "Event concept and budget approved by stakeholders",
                    "due_date_offset_weeks": 2
                },
                {
                    "title": "Venue Booked",
                    "description": "Event venue secured and contract signed",
                    "due_date_offset_weeks": 4
                },
                {
                    "title": "Vendors Confirmed",
                    "description": "All major vendors confirmed and contracts signed",
                    "due_date_offset_weeks": 8
                },
                {
                    "title": "Registration Open",
                    "description": "Event registration system live and accepting registrations",
                    "due_date_offset_weeks": 10
                },
                {
                    "title": "Event Day",
                    "description": "Event successfully executed",
                    "due_date_offset_weeks": 14
                },
                {
                    "title": "Post-Event Complete",
                    "description": "Post-event analysis and reporting completed",
                    "due_date_offset_weeks": 15
                }
            ],
            "team_roles": [
                {"role": "event_manager", "description": "Overall event planning and management"},
                {"role": "venue_coordinator", "description": "Venue selection and management"},
                {"role": "vendor_coordinator", "description": "Vendor sourcing and management"},
                {"role": "talent_coordinator", "description": "Speaker and entertainment booking"},
                {"role": "marketing_coordinator", "description": "Event marketing and promotion"},
                {"role": "logistics_coordinator", "description": "Transportation and logistics planning"},
                {"role": "tech_coordinator", "description": "Technology and AV coordination"},
                {"role": "setup_crew", "description": "Event setup and breakdown"},
                {"role": "guest_services", "description": "Attendee services and support"}
            ],
            "settings": {
                "event_duration_days": 1,
                "setup_time_hours": 4,
                "breakdown_time_hours": 2,
                "backup_plan_required": True,
                "insurance_required": True,
                "catering_required": True,
                "av_equipment_required": True
            }
        }
    
    @staticmethod
    def _get_research_project_template() -> Dict[str, Any]:
        """Research Project Template - Based on academic and industry research standards"""
        return {
            "name": "Research Project",
            "description": "Comprehensive research project following scientific methodology with literature review, data collection, analysis, and reporting",
            "methodology": "Scientific Research Method",
            "estimated_duration": "16-24 weeks",
            "phases": [
                {
                    "name": "Research Planning",
                    "duration_weeks": 3,
                    "description": "Research design, proposal, and initial planning",
                    "tasks": [
                        {
                            "title": "Research Question Formulation",
                            "description": "Define research questions, hypotheses, and objectives",
                            "priority": "high",
                            "estimated_hours": 16,
                            "assignee_role": "principal_investigator"
                        },
                        {
                            "title": "Literature Review Planning",
                            "description": "Develop literature review strategy and search criteria",
                            "priority": "high",
                            "estimated_hours": 12,
                            "assignee_role": "research_assistant"
                        },
                        {
                            "title": "Research Methodology Design",
                            "description": "Design research methodology, data collection methods, and analysis plan",
                            "priority": "high",
                            "estimated_hours": 20,
                            "assignee_role": "principal_investigator"
                        },
                        {
                            "title": "Ethics Approval Application",
                            "description": "Prepare and submit ethics approval application if required",
                            "priority": "high",
                            "estimated_hours": 8,
                            "assignee_role": "principal_investigator"
                        },
                        {
                            "title": "Research Proposal Writing",
                            "description": "Write comprehensive research proposal",
                            "priority": "medium",
                            "estimated_hours": 24,
                            "assignee_role": "principal_investigator"
                        }
                    ]
                },
                {
                    "name": "Literature Review",
                    "duration_weeks": 4,
                    "description": "Comprehensive literature review and theoretical framework",
                    "tasks": [
                        {
                            "title": "Database Search & Article Collection",
                            "description": "Search academic databases and collect relevant articles",
                            "priority": "high",
                            "estimated_hours": 32,
                            "assignee_role": "research_assistant"
                        },
                        {
                            "title": "Article Screening & Selection",
                            "description": "Screen articles based on inclusion/exclusion criteria",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "research_assistant"
                        },
                        {
                            "title": "Critical Analysis & Synthesis",
                            "description": "Analyze and synthesize literature findings",
                            "priority": "high",
                            "estimated_hours": 40,
                            "assignee_role": "principal_investigator"
                        },
                        {
                            "title": "Theoretical Framework Development",
                            "description": "Develop theoretical framework based on literature review",
                            "priority": "medium",
                            "estimated_hours": 20,
                            "assignee_role": "principal_investigator"
                        },
                        {
                            "title": "Literature Review Writing",
                            "description": "Write comprehensive literature review chapter",
                            "priority": "medium",
                            "estimated_hours": 32,
                            "assignee_role": "principal_investigator"
                        }
                    ]
                },
                {
                    "name": "Data Collection",
                    "duration_weeks": 6,
                    "description": "Primary data collection and preparation",
                    "tasks": [
                        {
                            "title": "Data Collection Tool Development",
                            "description": "Develop surveys, interview guides, or experimental protocols",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "research_assistant"
                        },
                        {
                            "title": "Pilot Study",
                            "description": "Conduct pilot study to test data collection methods",
                            "priority": "medium",
                            "estimated_hours": 16,
                            "assignee_role": "research_assistant"
                        },
                        {
                            "title": "Participant Recruitment",
                            "description": "Recruit study participants and obtain informed consent",
                            "priority": "high",
                            "estimated_hours": 32,
                            "assignee_role": "research_assistant"
                        },
                        {
                            "title": "Primary Data Collection",
                            "description": "Collect primary data through surveys, interviews, or experiments",
                            "priority": "high",
                            "estimated_hours": 80,
                            "assignee_role": "research_assistant"
                        },
                        {
                            "title": "Data Quality Control",
                            "description": "Check data quality, completeness, and accuracy",
                            "priority": "medium",
                            "estimated_hours": 20,
                            "assignee_role": "data_analyst"
                        }
                    ]
                },
                {
                    "name": "Data Analysis",
                    "duration_weeks": 4,
                    "description": "Statistical analysis and interpretation",
                    "tasks": [
                        {
                            "title": "Data Cleaning & Preparation",
                            "description": "Clean and prepare data for analysis",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "data_analyst"
                        },
                        {
                            "title": "Statistical Analysis",
                            "description": "Perform statistical analysis using appropriate methods",
                            "priority": "high",
                            "estimated_hours": 40,
                            "assignee_role": "statistician"
                        },
                        {
                            "title": "Results Interpretation",
                            "description": "Interpret statistical results and findings",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "principal_investigator"
                        },
                        {
                            "title": "Visualization Creation",
                            "description": "Create charts, graphs, and visual representations of data",
                            "priority": "medium",
                            "estimated_hours": 16,
                            "assignee_role": "data_analyst"
                        }
                    ]
                },
                {
                    "name": "Reporting & Dissemination",
                    "duration_weeks": 3,
                    "description": "Report writing and research dissemination",
                    "tasks": [
                        {
                            "title": "Research Report Writing",
                            "description": "Write comprehensive research report or thesis",
                            "priority": "high",
                            "estimated_hours": 48,
                            "assignee_role": "principal_investigator"
                        },
                        {
                            "title": "Peer Review & Revision",
                            "description": "Conduct peer review and revise report based on feedback",
                            "priority": "medium",
                            "estimated_hours": 24,
                            "assignee_role": "principal_investigator"
                        },
                        {
                            "title": "Presentation Preparation",
                            "description": "Prepare research presentation for conferences or stakeholders",
                            "priority": "medium",
                            "estimated_hours": 16,
                            "assignee_role": "principal_investigator"
                        },
                        {
                            "title": "Publication Submission",
                            "description": "Submit research for publication in academic journals",
                            "priority": "low",
                            "estimated_hours": 12,
                            "assignee_role": "principal_investigator"
                        }
                    ]
                }
            ],
            "milestones": [
                {
                    "title": "Research Proposal Approved",
                    "description": "Research proposal approved by stakeholders or ethics committee",
                    "due_date_offset_weeks": 3
                },
                {
                    "title": "Literature Review Complete",
                    "description": "Comprehensive literature review completed",
                    "due_date_offset_weeks": 7
                },
                {
                    "title": "Data Collection Complete",
                    "description": "All primary data collection completed",
                    "due_date_offset_weeks": 13
                },
                {
                    "title": "Data Analysis Complete",
                    "description": "Statistical analysis and interpretation completed",
                    "due_date_offset_weeks": 17
                },
                {
                    "title": "Final Report Complete",
                    "description": "Final research report completed and submitted",
                    "due_date_offset_weeks": 20
                }
            ],
            "team_roles": [
                {"role": "principal_investigator", "description": "Lead researcher and project director"},
                {"role": "research_assistant", "description": "Data collection and literature review support"},
                {"role": "data_analyst", "description": "Data analysis and statistical support"},
                {"role": "statistician", "description": "Statistical analysis and methodology expert"},
                {"role": "research_coordinator", "description": "Project coordination and administration"},
                {"role": "field_researcher", "description": "Field data collection and participant interaction"}
            ],
            "settings": {
                "ethics_approval_required": True,
                "peer_review_required": True,
                "data_storage_requirements": "secure",
                "publication_target": "academic_journal",
                "confidentiality_level": "high",
                "backup_data_required": True
            }
        }
    
    @staticmethod
    def _get_product_launch_template() -> Dict[str, Any]:
        """Product Launch Template - Based on product management best practices"""
        return {
            "name": "Product Launch",
            "description": "Comprehensive product launch strategy with market research, development, marketing, and post-launch optimization",
            "methodology": "Product Management Framework",
            "estimated_duration": "20-24 weeks",
            "phases": [
                {
                    "name": "Market Research & Strategy",
                    "duration_weeks": 4,
                    "description": "Market analysis, competitive research, and launch strategy",
                    "tasks": [
                        {
                            "title": "Market Analysis",
                            "description": "Analyze target market, customer segments, and market size",
                            "priority": "high",
                            "estimated_hours": 32,
                            "assignee_role": "market_researcher"
                        },
                        {
                            "title": "Competitive Analysis",
                            "description": "Analyze competitors, their products, pricing, and positioning",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "competitive_analyst"
                        },
                        {
                            "title": "Customer Research",
                            "description": "Conduct customer interviews, surveys, and persona development",
                            "priority": "high",
                            "estimated_hours": 28,
                            "assignee_role": "ux_researcher"
                        },
                        {
                            "title": "Launch Strategy Development",
                            "description": "Develop comprehensive product launch strategy and timeline",
                            "priority": "high",
                            "estimated_hours": 20,
                            "assignee_role": "product_manager"
                        }
                    ]
                },
                {
                    "name": "Product Development",
                    "duration_weeks": 12,
                    "description": "Product development, testing, and refinement",
                    "tasks": [
                        {
                            "title": "Product Requirements Definition",
                            "description": "Define detailed product requirements and specifications",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "product_manager"
                        },
                        {
                            "title": "Design & Prototyping",
                            "description": "Create product designs, wireframes, and prototypes",
                            "priority": "high",
                            "estimated_hours": 48,
                            "assignee_role": "product_designer"
                        },
                        {
                            "title": "Development & Engineering",
                            "description": "Develop the product according to specifications",
                            "priority": "high",
                            "estimated_hours": 320,
                            "assignee_role": "software_engineer"
                        },
                        {
                            "title": "Quality Assurance Testing",
                            "description": "Comprehensive testing of product functionality and performance",
                            "priority": "high",
                            "estimated_hours": 80,
                            "assignee_role": "qa_engineer"
                        },
                        {
                            "title": "User Acceptance Testing",
                            "description": "Test product with target users and gather feedback",
                            "priority": "medium",
                            "estimated_hours": 32,
                            "assignee_role": "ux_researcher"
                        }
                    ]
                },
                {
                    "name": "Pre-Launch Preparation",
                    "duration_weeks": 4,
                    "description": "Final preparations, marketing setup, and launch readiness",
                    "tasks": [
                        {
                            "title": "Marketing Campaign Development",
                            "description": "Develop comprehensive marketing campaigns and materials",
                            "priority": "high",
                            "estimated_hours": 40,
                            "assignee_role": "marketing_manager"
                        },
                        {
                            "title": "Sales Team Training",
                            "description": "Train sales team on product features and positioning",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "sales_manager"
                        },
                        {
                            "title": "Customer Support Preparation",
                            "description": "Prepare customer support team and documentation",
                            "priority": "medium",
                            "estimated_hours": 20,
                            "assignee_role": "support_manager"
                        },
                        {
                            "title": "Launch Infrastructure Setup",
                            "description": "Set up production infrastructure and monitoring systems",
                            "priority": "high",
                            "estimated_hours": 32,
                            "assignee_role": "devops_engineer"
                        }
                    ]
                },
                {
                    "name": "Launch Execution",
                    "duration_weeks": 2,
                    "description": "Product launch and initial market entry",
                    "tasks": [
                        {
                            "title": "Soft Launch",
                            "description": "Execute soft launch to limited user base",
                            "priority": "high",
                            "estimated_hours": 16,
                            "assignee_role": "product_manager"
                        },
                        {
                            "title": "Marketing Campaign Launch",
                            "description": "Launch full marketing campaigns across all channels",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "marketing_manager"
                        },
                        {
                            "title": "Public Launch",
                            "description": "Execute public product launch and announcement",
                            "priority": "high",
                            "estimated_hours": 12,
                            "assignee_role": "product_manager"
                        },
                        {
                            "title": "Launch Monitoring",
                            "description": "Monitor launch metrics, user feedback, and system performance",
                            "priority": "high",
                            "estimated_hours": 20,
                            "assignee_role": "product_analyst"
                        }
                    ]
                },
                {
                    "name": "Post-Launch Optimization",
                    "duration_weeks": 2,
                    "description": "Post-launch analysis, optimization, and scaling",
                    "tasks": [
                        {
                            "title": "Performance Analysis",
                            "description": "Analyze launch performance, user adoption, and key metrics",
                            "priority": "high",
                            "estimated_hours": 20,
                            "assignee_role": "product_analyst"
                        },
                        {
                            "title": "User Feedback Analysis",
                            "description": "Analyze user feedback and identify improvement opportunities",
                            "priority": "medium",
                            "estimated_hours": 16,
                            "assignee_role": "ux_researcher"
                        },
                        {
                            "title": "Product Optimization",
                            "description": "Implement optimizations based on launch data and feedback",
                            "priority": "medium",
                            "estimated_hours": 24,
                            "assignee_role": "software_engineer"
                        },
                        {
                            "title": "Scaling Strategy",
                            "description": "Develop strategy for scaling product and operations",
                            "priority": "medium",
                            "estimated_hours": 12,
                            "assignee_role": "product_manager"
                        }
                    ]
                }
            ],
            "milestones": [
                {
                    "title": "Market Research Complete",
                    "description": "Market analysis and strategy development completed",
                    "due_date_offset_weeks": 4
                },
                {
                    "title": "Product Development Complete",
                    "description": "Product development and testing completed",
                    "due_date_offset_weeks": 16
                },
                {
                    "title": "Pre-Launch Ready",
                    "description": "All pre-launch preparations completed",
                    "due_date_offset_weeks": 20
                },
                {
                    "title": "Product Launched",
                    "description": "Product successfully launched to market",
                    "due_date_offset_weeks": 22
                },
                {
                    "title": "Launch Optimization Complete",
                    "description": "Post-launch analysis and optimization completed",
                    "due_date_offset_weeks": 24
                }
            ],
            "team_roles": [
                {"role": "product_manager", "description": "Overall product strategy and management"},
                {"role": "market_researcher", "description": "Market analysis and customer research"},
                {"role": "product_designer", "description": "Product design and user experience"},
                {"role": "software_engineer", "description": "Product development and engineering"},
                {"role": "marketing_manager", "description": "Marketing strategy and campaign execution"},
                {"role": "sales_manager", "description": "Sales strategy and team management"},
                {"role": "qa_engineer", "description": "Quality assurance and testing"},
                {"role": "product_analyst", "description": "Data analysis and performance tracking"},
                {"role": "devops_engineer", "description": "Infrastructure and deployment management"}
            ],
            "settings": {
                "launch_type": "public",
                "beta_testing_required": True,
                "soft_launch_duration_weeks": 1,
                "performance_monitoring_enabled": True,
                "user_feedback_collection": True,
                "competitive_monitoring": True
            }
        }
    
    @staticmethod
    def _get_consulting_engagement_template() -> Dict[str, Any]:
        """Consulting Engagement Template - Based on management consulting best practices"""
        return {
            "name": "Consulting Engagement",
            "description": "Professional consulting engagement with discovery, analysis, recommendations, and implementation support",
            "methodology": "Management Consulting Framework",
            "estimated_duration": "8-16 weeks",
            "phases": [
                {
                    "name": "Engagement Setup",
                    "duration_weeks": 1,
                    "description": "Project initiation, team setup, and initial planning",
                    "tasks": [
                        {
                            "title": "Engagement Letter & Contract",
                            "description": "Finalize engagement terms, scope, and deliverables",
                            "priority": "high",
                            "estimated_hours": 8,
                            "assignee_role": "engagement_manager"
                        },
                        {
                            "title": "Team Assembly & Roles",
                            "description": "Assemble consulting team and define roles and responsibilities",
                            "priority": "high",
                            "estimated_hours": 4,
                            "assignee_role": "engagement_manager"
                        },
                        {
                            "title": "Project Kickoff Meeting",
                            "description": "Conduct project kickoff with client stakeholders",
                            "priority": "high",
                            "estimated_hours": 4,
                            "assignee_role": "engagement_manager"
                        },
                        {
                            "title": "Work Plan Development",
                            "description": "Develop detailed work plan and timeline",
                            "priority": "medium",
                            "estimated_hours": 8,
                            "assignee_role": "engagement_manager"
                        }
                    ]
                },
                {
                    "name": "Discovery & Analysis",
                    "duration_weeks": 4,
                    "description": "Data collection, stakeholder interviews, and current state analysis",
                    "tasks": [
                        {
                            "title": "Stakeholder Interviews",
                            "description": "Conduct interviews with key stakeholders and decision makers",
                            "priority": "high",
                            "estimated_hours": 32,
                            "assignee_role": "senior_consultant"
                        },
                        {
                            "title": "Data Collection & Analysis",
                            "description": "Collect and analyze relevant business data and metrics",
                            "priority": "high",
                            "estimated_hours": 40,
                            "assignee_role": "data_analyst"
                        },
                        {
                            "title": "Current State Assessment",
                            "description": "Assess current business processes, systems, and performance",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "business_analyst"
                        },
                        {
                            "title": "Industry Benchmarking",
                            "description": "Benchmark client performance against industry standards",
                            "priority": "medium",
                            "estimated_hours": 16,
                            "assignee_role": "research_analyst"
                        }
                    ]
                },
                {
                    "name": "Solution Development",
                    "duration_weeks": 3,
                    "description": "Develop recommendations and solution design",
                    "tasks": [
                        {
                            "title": "Problem Identification & Root Cause Analysis",
                            "description": "Identify key problems and conduct root cause analysis",
                            "priority": "high",
                            "estimated_hours": 20,
                            "assignee_role": "senior_consultant"
                        },
                        {
                            "title": "Solution Design",
                            "description": "Design comprehensive solutions and recommendations",
                            "priority": "high",
                            "estimated_hours": 32,
                            "assignee_role": "senior_consultant"
                        },
                        {
                            "title": "Implementation Planning",
                            "description": "Develop detailed implementation plan and roadmap",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "implementation_specialist"
                        },
                        {
                            "title": "ROI Analysis & Business Case",
                            "description": "Calculate ROI and develop business case for recommendations",
                            "priority": "medium",
                            "estimated_hours": 16,
                            "assignee_role": "financial_analyst"
                        }
                    ]
                },
                {
                    "name": "Recommendation & Presentation",
                    "duration_weeks": 1,
                    "description": "Present findings and recommendations to client",
                    "tasks": [
                        {
                            "title": "Report Writing",
                            "description": "Write comprehensive consulting report with findings and recommendations",
                            "priority": "high",
                            "estimated_hours": 24,
                            "assignee_role": "senior_consultant"
                        },
                        {
                            "title": "Presentation Development",
                            "description": "Develop executive presentation and supporting materials",
                            "priority": "high",
                            "estimated_hours": 16,
                            "assignee_role": "presentation_specialist"
                        },
                        {
                            "title": "Client Presentation",
                            "description": "Present findings and recommendations to client executives",
                            "priority": "high",
                            "estimated_hours": 8,
                            "assignee_role": "engagement_manager"
                        },
                        {
                            "title": "Q&A & Discussion",
                            "description": "Address client questions and refine recommendations",
                            "priority": "medium",
                            "estimated_hours": 8,
                            "assignee_role": "senior_consultant"
                        }
                    ]
                },
                {
                    "name": "Implementation Support",
                    "duration_weeks": 4,
                    "description": "Support client implementation of recommendations",
                    "tasks": [
                        {
                            "title": "Implementation Planning Support",
                            "description": "Support client in detailed implementation planning",
                            "priority": "high",
                            "estimated_hours": 20,
                            "assignee_role": "implementation_specialist"
                        },
                        {
                            "title": "Change Management Support",
                            "description": "Support organizational change management activities",
                            "priority": "medium",
                            "estimated_hours": 16,
                            "assignee_role": "change_management_specialist"
                        },
                        {
                            "title": "Training & Knowledge Transfer",
                            "description": "Conduct training sessions and knowledge transfer",
                            "priority": "medium",
                            "estimated_hours": 24,
                            "assignee_role": "training_specialist"
                        },
                        {
                            "title": "Progress Monitoring",
                            "description": "Monitor implementation progress and provide guidance",
                            "priority": "medium",
                            "estimated_hours": 16,
                            "assignee_role": "engagement_manager"
                        }
                    ]
                }
            ],
            "milestones": [
                {
                    "title": "Engagement Started",
                    "description": "Consulting engagement officially started",
                    "due_date_offset_weeks": 1
                },
                {
                    "title": "Discovery Complete",
                    "description": "Discovery and analysis phase completed",
                    "due_date_offset_weeks": 5
                },
                {
                    "title": "Recommendations Ready",
                    "description": "Recommendations and solutions developed",
                    "due_date_offset_weeks": 8
                },
                {
                    "title": "Client Presentation Complete",
                    "description": "Findings presented to client executives",
                    "due_date_offset_weeks": 9
                },
                {
                    "title": "Implementation Support Complete",
                    "description": "Implementation support phase completed",
                    "due_date_offset_weeks": 13
                }
            ],
            "team_roles": [
                {"role": "engagement_manager", "description": "Overall engagement management and client relationship"},
                {"role": "senior_consultant", "description": "Senior consulting and solution development"},
                {"role": "business_analyst", "description": "Business analysis and process assessment"},
                {"role": "data_analyst", "description": "Data analysis and insights generation"},
                {"role": "research_analyst", "description": "Industry research and benchmarking"},
                {"role": "implementation_specialist", "description": "Implementation planning and support"},
                {"role": "financial_analyst", "description": "Financial analysis and ROI calculations"},
                {"role": "change_management_specialist", "description": "Change management and organizational support"},
                {"role": "training_specialist", "description": "Training and knowledge transfer"}
            ],
            "settings": {
                "engagement_type": "strategic",
                "client_industry": "general",
                "confidentiality_level": "high",
                "deliverable_format": "executive_report",
                "implementation_support_included": True,
                "follow_up_engagement": "optional"
            }
        }
    
    @staticmethod
    def apply_template_to_project(template_id: str, project_name: str, start_date: datetime = None) -> Dict[str, Any]:
        """Apply a template to create a new project structure"""
        templates = ProjectTemplateService.get_default_templates()
        
        if template_id not in templates:
            raise ValueError(f"Template '{template_id}' not found")
        
        template = templates[template_id]
        
        if not start_date:
            start_date = datetime.now()
        
        # Calculate project end date based on template duration
        total_weeks = sum(phase["duration_weeks"] for phase in template["phases"])
        end_date = start_date + timedelta(weeks=total_weeks)
        
        # Create project structure
        project_structure = {
            "name": project_name,
            "description": template["description"],
            "start_date": start_date,
            "end_date": end_date,
            "settings": template.get("settings", {}),
            "phases": [],
            "milestones": [],
            "team_roles": template["team_roles"]
        }
        
        # Process phases and tasks
        current_date = start_date
        for phase in template["phases"]:
            phase_end_date = current_date + timedelta(weeks=phase["duration_weeks"])
            
            phase_structure = {
                "name": phase["name"],
                "description": phase["description"],
                "start_date": current_date,
                "end_date": phase_end_date,
                "tasks": []
            }
            
            # Process tasks
            for task in phase["tasks"]:
                task_structure = {
                    "title": task["title"],
                    "description": task["description"],
                    "priority": task["priority"],
                    "estimated_hours": task["estimated_hours"],
                    "assignee_role": task["assignee_role"],
                    "status": "todo"
                }
                
                # Add recurring task properties if applicable
                if task.get("recurring"):
                    task_structure["recurring"] = task["recurring"]
                    task_structure["recurring_frequency"] = task["recurring_frequency"]
                
                phase_structure["tasks"].append(task_structure)
            
            project_structure["phases"].append(phase_structure)
            current_date = phase_end_date
        
        # Process milestones
        for milestone in template["milestones"]:
            milestone_date = start_date + timedelta(weeks=milestone["due_date_offset_weeks"])
            # Convert to timezone-naive datetime for database storage
            milestone_date_naive = milestone_date.replace(tzinfo=None) if milestone_date else None
            milestone_structure = {
                "title": milestone["title"],
                "description": milestone["description"],
                "due_date": milestone_date_naive,
                "is_completed": False
            }
            project_structure["milestones"].append(milestone_structure)
        
        return project_structure
