using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Profiles;
using StudentPortal.Repositories;
using StudentPortal.Services;
using StudentPortal.Validations;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

// Registracija DbContext-a
builder.Services.AddDbContext<StudentPortalApiContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Registracija AutoMappera

// Registracija repozitorija za Dependency Injection
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ISubjectRepository, SubjectRepository>();
builder.Services.AddScoped<IEnrollmentRepository, EnrollmentRepository>();
builder.Services.AddScoped<IGradeRepository, GradeRepository>();

// Registracija servisa za Dependency Injection
builder.Services.AddScoped<IUserService, UserService>();
//builder.Services.AddScoped<ISubjectService, SubjectService>();
//builder.Services.AddScoped<IEnrollmentService, EnrollmentService>();
//builder.Services.AddScoped<IGradeService, GradeService>();

builder.Services.AddAutoMapper(cfg =>
{
   
    cfg.AddProfile<MappingProfile>();
}, typeof(MappingProfile).Assembly);

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();