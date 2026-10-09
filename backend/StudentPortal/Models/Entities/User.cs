using StudentPortal.Models.Enums;
using System;
using System.Collections.Generic;

namespace StudentPortal.Models.Entities;

public  class User
{
    public Guid Id { get; set; }

    public string FirstName { get; set; } 

    public string LastName { get; set; } 

    public string Email { get; set; }

    public string UserPassword { get; set; } 

    public string IndexNumber { get; set; }

    public bool IsDeleted { get; set; }

    public RoleEnum UserRole { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual IEnumerable<Enrollment> Enrollments { get; set; } = new List<Enrollment>();

    public virtual IEnumerable<Subject> Subjects { get; set; } = new List<Subject>();
}
